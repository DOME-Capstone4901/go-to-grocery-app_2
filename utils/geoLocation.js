import * as Location from 'expo-location';

/**
 * Current device/browser coordinates after permission (foreground).
 * Web uses the browser geolocation API via expo-location.
 */
export async function getUserLatLng() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, reason: 'denied' };
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    ok: true,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}
