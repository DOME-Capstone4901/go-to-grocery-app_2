import { getApiBaseCandidates } from './groceryPlaces';
import { mockNearbyStoresAroundPoint } from './mockLiveMapData';

/**
 * Nearby grocery / supermarket / convenience POIs within radius (meters).
 * Falls back to generated mock data when the backend is unreachable.
 */
export async function fetchNearbyFoodRetail(lat, lng, radiusMeters) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    throw new Error('Invalid coordinates');
  }
  const r = Math.min(Math.max(Number(radiusMeters) || 3000, 100), 50000);

  for (const apiBase of getApiBaseCandidates()) {
    try {
      const res = await fetch(`${apiBase}/places/nearby-food-retail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: la, lng: ln, radiusMeters: r }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.stores)) {
        return {
          lat: Number(data.lat),
          lng: Number(data.lng),
          radiusMeters: Number(data.radiusMeters) || r,
          stores: data.stores,
          source: data.source || 'api',
          demo: Boolean(data.demo),
          note: data.note,
        };
      }
    } catch {
      /* try next host */
    }
  }

  const radiusKm = r / 1000;
  return {
    lat: la,
    lng: ln,
    radiusMeters: r,
    stores: mockNearbyStoresAroundPoint(la, ln, radiusKm),
    source: 'client_mock',
    demo: true,
    note: 'Backend unreachable — showing mock stores around this point.',
  };
}
