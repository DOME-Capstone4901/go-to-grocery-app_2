const zipcodes = require('zipcodes');
import { getRecipeApiBase } from './apiBase';

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
        `Cannot reach the store API at ${apiBase}. Start backend in recipe-backend and verify EXPO_PUBLIC_RECIPE_API_URL points to it.`
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
