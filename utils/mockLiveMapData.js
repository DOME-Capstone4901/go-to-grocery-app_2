/** Client-side mock when APIs are offline — mirrors server mockBroadStoresNear shape. */

function deg2rad(n) {
  return (n * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MOCK_LABELS = [
  ['Neighborhood Market', 'Supermarket'],
  ['Quick Stop Mart', 'Convenience store'],
  ['Fresh Foods Co-op', 'Grocery / supermarket'],
  ['City Grocer', 'Supermarket'],
  ['Express Mini Mart', 'Convenience store'],
  ['Organic Pantry', 'Grocery / retail'],
  ['Family Dollar Foods', 'General store'],
  ['Main Street Foods', 'Supermarket'],
];

export function mockNearbyStoresAroundPoint(lat, lng, radiusKm) {
  const la = Number(lat);
  const ln = Number(lng);
  const rKm = Math.min(Math.max(Number(radiusKm) || 3, 0.5), 50);
  const out = [];
  for (let i = 0; i < MOCK_LABELS.length; i += 1) {
    const angle = (i / MOCK_LABELS.length) * Math.PI * 2;
    const frac = 0.25 + (i % 4) * 0.15;
    const dk = rKm * frac;
    const dLat = (dk / 111) * Math.sin(angle);
    const dLng = (dk / (111 * Math.cos(deg2rad(la)))) * Math.cos(angle);
    const plat = la + dLat;
    const plng = ln + dLng;
    out.push({
      id: `mock-retail-${i}`,
      placeId: `mock-retail-${i}`,
      name: MOCK_LABELS[i][0],
      address: `${100 + i * 17} Demo Rd (offline mock)`,
      lat: plat,
      lng: plng,
      category: MOCK_LABELS[i][1],
      distanceKm: Math.round(distanceKm(la, ln, plat, plng) * 1000) / 1000,
    });
  }
  return out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}
