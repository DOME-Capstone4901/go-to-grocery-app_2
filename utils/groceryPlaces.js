const zipcodes = require('zipcodes');
import { getRecipeApiBase } from './apiBase';

const GROCERY_BRANDS = ['walmart', 'kroger', 'aldi'];

export const FEATURED_AREAS = [
  {
    id: 'area-dfw',
    label: 'DFW Metroplex, TX',
    city: 'Dallas-Fort Worth',
    state: 'TX',
    lat: 32.7767,
    lng: -96.797,
    aliases: ['dfw', 'dallas fort worth', 'dallas-fort worth', 'dfw area', 'dfw metroplex'],
  },
  {
    id: 'area-denton',
    label: 'Denton, TX',
    city: 'Denton',
    state: 'TX',
    lat: 33.2148,
    lng: -97.1331,
    aliases: ['denton', 'denton tx', 'denton area'],
  },
];

function normalizeLocationQuery(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveFeaturedArea(raw) {
  const normalized = normalizeLocationQuery(raw);
  if (!normalized) return null;
  return FEATURED_AREAS.find(area => area.aliases.includes(normalized)) || null;
}

/**
 * Resolve US city+state or ZIP to coordinates using the bundled `zipcodes` DB (no Google call).
 * Returns null if the user should be geocoded on the server (e.g. street address or city-only).
 */
export function resolveSearchToLocation(raw) {
  const q = raw.trim();
  if (!q) return null;
  const featured = resolveFeaturedArea(q);
  if (featured) {
    return {
      lat: featured.lat,
      lng: featured.lng,
      label: featured.label,
      city: featured.city,
      state: featured.state,
      zip: '',
    };
  }

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

function makeDemoStores(lat, lng) {
  const centerLat = Number(lat);
  const centerLng = Number(lng);
  const sample = [
    {
      brand: 'walmart',
      name: 'Walmart Supercenter',
      address: 'Demo store near this area',
      lat: centerLat + 0.012,
      lng: centerLng - 0.01,
    },
    {
      brand: 'kroger',
      name: 'Kroger',
      address: 'Demo store near this area',
      lat: centerLat - 0.009,
      lng: centerLng + 0.014,
    },
    {
      brand: 'aldi',
      name: 'ALDI',
      address: 'Demo store near this area',
      lat: centerLat + 0.016,
      lng: centerLng + 0.008,
    },
  ];

  return sample.map((store, idx) => ({
    id: `demo-${store.brand}-${idx}`,
    placeId: '',
    brand: store.brand,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    miles: null,
  }));
}

function demoStoreResponse(lat, lng, label = '', note = '') {
  return {
    lat: Number(lat),
    lng: Number(lng),
    locationLabel: label,
    stores: makeDemoStores(lat, lng),
    brands: GROCERY_BRANDS,
    mode: 'client_demo_fallback',
    note,
  };
}

function postJsonWithTimeout(url, body, timeoutMs = 1800) {
  if (typeof AbortController === 'undefined') {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify(body),
  }).finally(() => clearTimeout(timeoutId));
}

/**
 * Loads Walmart, Kroger, and Aldi near a point via the recipe backend (Google Places Nearby Search).
 */
export async function fetchGroceryChainStores(params = {}) {
  const { lat, lng, query } = params;
  const hasCoords = lat != null && lng != null;
  const q = String(query ?? '').trim();
  if (!hasCoords && !q) {
    throw new Error('Enter a ZIP, city and state, or address.');
  }
  const body = hasCoords ? { lat: Number(lat), lng: Number(lng) } : { query: q };

  const apiBase = getRecipeApiBase();
  const url = `${apiBase}/places/grocery-stores`;

  let res;
  try {
    res = await postJsonWithTimeout(url, body);
  } catch (e) {
    const msg = e?.message || String(e);
    const isNetwork =
      msg === 'Failed to fetch' ||
      msg.includes('Network request failed') ||
      e?.name === 'TypeError' ||
      e?.name === 'AbortError' ||
      msg.toLowerCase().includes('abort');

    if (isNetwork && hasCoords) {
      return demoStoreResponse(
        lat,
        lng,
        q,
        `Could not reach ${apiBase} quickly. Showing demo stores while backend is offline or slow.`
      );
    }

    if (isNetwork) {
      throw new Error(
        `Cannot reach the store API at ${apiBase}. Start backend in recipe-backend and verify EXPO_PUBLIC_RECIPE_API_URL points to it.`
      );
    }
    throw e;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (hasCoords) {
      return demoStoreResponse(
        lat,
        lng,
        data.locationLabel || q,
        data.error || `Stores request failed (${res.status}). Showing demo stores.`
      );
    }
    throw new Error(data.error || `Stores request failed (${res.status})`);
  }
  return data;
}

export function mapsUrlForPlace({ placeId, name, lat, lng }) {
  const destinationLabel = encodeURIComponent(name || 'grocery store');
  if (placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationLabel}&destination_place_id=${encodeURIComponent(placeId)}&travelmode=driving`;
  }
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destinationLabel}`;
}