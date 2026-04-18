/**
 * Rough US (+ AK, HI, PR) bounds for filtering map points. Not for legal address validation.
 */
export function isLatLngInsideUnitedStates(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;

  const continental = la >= 24.0 && la <= 49.6 && lo >= -124.95 && lo <= -66.5;
  const alaska = la >= 51.2 && la <= 71.6 && lo >= -168.9 && lo <= -129.8;
  const hawaii = la >= 18.7 && la <= 22.6 && lo >= -160.9 && lo <= -154.6;
  const puertoRico = la >= 17.8 && la <= 18.6 && lo >= -67.5 && lo <= -65.1;

  return continental || alaska || hawaii || puertoRico;
}

export function filterStoresToUnitedStates(stores) {
  if (!Array.isArray(stores)) return [];
  return stores.filter(s => {
    if (s?.lat == null || s?.lng == null) return false;
    return isLatLngInsideUnitedStates(s.lat, s.lng);
  });
}
