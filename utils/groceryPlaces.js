import { filterStoresToUnitedStates } from './usBounds';

const zipcodes = require('zipcodes');

/** Match server stripLeadingChainQuery — "Kroger 90210" → "90210" for local ZIP lookup. */
function stripLeadingChainQuery(raw) {
  const t = String(raw || '').trim();
  if (/^\s*(walmart|kroger|aldi)\s*$/i.test(t)) return '';
  const m = t.match(/^\s*(walmart|kroger|aldi)\s+(.+)$/i);
  return m ? m[2].trim() : t;
}

/**
 * Resolve US city+state or ZIP to coordinates using the bundled `zipcodes` DB (no Google call).
 * Returns null if the user should be geocoded on the server (e.g. street address or city-only).
 */
export function resolveSearchToLocation(raw) {
  const q = stripLeadingChainQuery(raw).trim();
  if (!q) return null;

  const digits = q.replace(/\D/g, '');
  const hasLetters = /[a-zA-Z]/.test(q);

  if (digits.length === 5 && !hasLetters) {
    const z = zipcodes.lookup(digits);
    if (z?.latitude != null && z.country === 'US') {
      return {
        lat: z.latitude,
        lng: z.longitude,
        label: `${z.city}, ${z.state} ${z.zip}`,
        zip: String(z.zip),
        city: z.city,
        state: z.state,
      };
    }
  }

  const comma = q.match(/^([^,]+),\s*([A-Za-z]{2})\s*$/);
  if (comma) {
    const city = comma[1].trim();
    const state = comma[2].trim().toUpperCase();
    const hits = zipcodes.lookupByName(city, state);
    if (hits?.length) {
      const z = hits[0];
      return {
        lat: z.latitude,
        lng: z.longitude,
        label: `${z.city}, ${z.state}`,
        zip: String(z.zip),
        city: z.city,
        state: z.state,
      };
    }
  }

  const space = q.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (space && !q.includes(',')) {
    const city = space[1].trim();
    const state = space[2].toUpperCase();
    if (city.length >= 2 && state.length === 2) {
      const hits = zipcodes.lookupByName(city, state);
      if (hits?.length) {
        const z = hits[0];
        return {
          lat: z.latitude,
          lng: z.longitude,
          label: `${z.city}, ${z.state}`,
          zip: String(z.zip),
          city: z.city,
          state: z.state,
        };
      }
    }
  }

  return null;
}

const DEFAULT_API_PORT = 3000;

/**
 * Store API base URL.
 * - EXPO_PUBLIC_RECIPE_API_URL overrides everything when set.
 * - On web, uses the same hostname as the page (fixes localhost vs 127.0.0.1 mismatch).
 * - On native, defaults to localhost unless you set the env (use your machine IP on a real device).
 */
function getApiBase() {
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_RECIPE_API_URL) {
    return String(process.env.EXPO_PUBLIC_RECIPE_API_URL).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { hostname } = window.location;
    if (hostname) {
      return `http://${hostname}:${DEFAULT_API_PORT}`;
    }
  }
  return `http://localhost:${DEFAULT_API_PORT}`;
}

/** Try localhost and 127.0.0.1 — some Windows setups only resolve one of them. */
function getApiBaseCandidates() {
  const primary = getApiBase();
  const out = new Set([primary]);
  if (primary.includes('://localhost:')) {
    out.add(primary.replace('://localhost:', '://127.0.0.1:'));
  }
  if (primary.includes('://127.0.0.1:')) {
    out.add(primary.replace('://127.0.0.1:', '://localhost:'));
  }
  return [...out];
}

/**
 * US location autocomplete (Nominatim via recipe-backend). Debounce on the caller; Nominatim ~1 req/s fair use.
 */
export async function fetchGeocodeSuggestions(text) {
  const q = String(text ?? '').trim();
  if (q.length < 2) {
    return [];
  }
  const candidates = getApiBaseCandidates();
  let lastErr;
  for (const apiBase of candidates) {
    const url = `${apiBase}/places/geocode-suggest?q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      const rows = Array.isArray(data.suggestions) ? data.suggestions : [];
      return rows;
    } catch (e) {
      lastErr = e;
    }
  }
  void lastErr;
  return [];
}

/**
 * Loads Walmart, Kroger, and Aldi near a point via the recipe backend.
 * - With GOOGLE_MAPS_API_KEY: Google Places Nearby Search (billing may apply).
 * - Without it: free OpenStreetMap Overpass + Nominatim geocoding (coverage varies by OSM data).
 */
export async function fetchGroceryChainStores(params = {}) {
  const { lat, lng, query } = params;
  const hasCoords = lat != null && lng != null;
  const q = String(query ?? '').trim();
  if (!hasCoords && !q) {
    throw new Error('Enter a ZIP, city and state, or address.');
  }
  const body = hasCoords ? { lat: Number(lat), lng: Number(lng) } : { query: q };

  const candidates = getApiBaseCandidates();
  let res;
  let lastNetworkErr;
  for (const apiBase of candidates) {
    const url = `${apiBase}/places/grocery-stores`;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      lastNetworkErr = null;
      break;
    } catch (e) {
      lastNetworkErr = e;
    }
  }

  if (!res && lastNetworkErr) {
    const e = lastNetworkErr;
    const msg = e?.message || String(e);
    const isNetwork =
      msg === 'Failed to fetch' ||
      msg.includes('Network request failed') ||
      e?.name === 'TypeError';
    if (isNetwork) {
      const tried = candidates.join(' · ');
      throw new Error(
        `Cannot reach the store API (tried: ${tried}). From the project root run: npm run recipe-backend — or: cd recipe-backend && npm start. Set GOOGLE_MAPS_API_KEY in recipe-backend/.env for live Google Places (optional: demo mode works without it). Use port 3000 or set EXPO_PUBLIC_RECIPE_API_URL.`
      );
    }
    throw e;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Stores request failed (${res.status})`);
  }
  if (Array.isArray(data.stores)) {
    data.stores = filterStoresToUnitedStates(data.stores);
  }
  return data;
}

export function mapsUrlForPlace({ placeId, name, lat, lng }) {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || 'place')}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Opens Google Maps driving directions. Prefer passing user GPS as origin when available.
 */
export function mapsDrivingDirectionsUrl({
  originLat,
  originLng,
  destLat,
  destLng,
  placeId,
  name,
}) {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  const dLat = Number(destLat);
  const dLng = Number(destLng);
  const pid = placeId != null ? String(placeId) : '';
  const isDemo = pid.startsWith('demo-');
  if (pid && !isDemo && pid.length > 8) {
    params.set('destination', String(name || 'Store').slice(0, 200));
    params.set('destination_place_id', pid);
  } else if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
    params.set('destination', `${dLat},${dLng}`);
  } else {
    /** Free-text destination (store name + address); Google Maps geocodes it. */
    params.set('destination', String(name || 'Store').slice(0, 200));
  }

  const oLa = Number(originLat);
  const oLn = Number(originLng);
  if (Number.isFinite(oLa) && Number.isFinite(oLn)) {
    params.set('origin', `${oLa},${oLn}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
