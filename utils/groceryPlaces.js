const zipcodes = require('zipcodes');

/**
 * Resolve US city+state or ZIP to coordinates using the bundled `zipcodes` DB (no Google call).
 * Returns null if the user should be geocoded on the server (e.g. street address or city-only).
 */
export function resolveSearchToLocation(raw) {
  const q = raw.trim();
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

/**
 * Loads Walmart, Kroger, and Aldi near a point via the recipe backend (Google Places Nearby Search).
 * Google Cloud billing applies; many projects get $200/mo credit — not unlimited “free.”
 */
export async function fetchGroceryChainStores(params = {}) {
  const { lat, lng, query } = params;
  const hasCoords = lat != null && lng != null;
  const q = String(query ?? '').trim();
  if (!hasCoords && !q) {
    throw new Error('Enter a ZIP, city and state, or address.');
  }
  const body = hasCoords ? { lat: Number(lat), lng: Number(lng) } : { query: q };

  const apiBase = getApiBase();
  const url = `${apiBase}/places/grocery-stores`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e?.message || String(e);
    const isNetwork =
      msg === 'Failed to fetch' ||
      msg.includes('Network request failed') ||
      e?.name === 'TypeError';
    if (isNetwork) {
      throw new Error(
        `Cannot reach the store API at ${apiBase}. In a separate terminal run: cd recipe-backend && npm start (needs GOOGLE_MAPS_API_KEY in recipe-backend/.env). Ensure nothing else uses port 3000.`
      );
    }
    throw e;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Stores request failed (${res.status})`);
  }
  return data;
}

export function mapsUrlForPlace({ placeId, name, lat, lng }) {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || 'place')}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
