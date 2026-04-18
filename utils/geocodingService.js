import * as Location from 'expo-location';

import { getApiBaseCandidates } from './groceryPlaces';

/**
 * Reverse geocode lat/lng → structured address.
 * Order: recipe-backend Nominatim → Expo reverseGeocodeAsync → mock.
 */
export async function reverseGeocodeLatLng(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    throw new Error('Invalid coordinates');
  }

  for (const apiBase of getApiBaseCandidates()) {
    try {
      const url = `${apiBase}/places/reverse-geocode`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: la, lng: ln }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.latitude != null) {
        return normalizeServerReverse(data);
      }
    } catch {
      /* try next */
    }
  }

  try {
    const rows = await Location.reverseGeocodeAsync({
      latitude: la,
      longitude: ln,
    });
    const a = rows?.[0];
    if (a) {
      return {
        latitude: la,
        longitude: ln,
        formattedAddress: [a.name, a.street, a.city, a.region, a.postalCode, a.country]
          .filter(Boolean)
          .join(', '),
        country: a.country || '',
        countryCode: a.isoCountryCode || '',
        city: a.city || a.subregion || '',
        locality: a.district || a.subregion || '',
        state: a.region || '',
        postalCode: a.postalCode || '',
        streetLine: [a.streetNumber, a.street].filter(Boolean).join(' ').trim(),
        raw: a,
        source: 'expo',
      };
    }
  } catch {
    /* fall through */
  }

  return mockReverseGeocode(la, ln);
}

function normalizeServerReverse(data) {
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    formattedAddress: String(data.formattedAddress || ''),
    country: String(data.country || ''),
    countryCode: String(data.countryCode || ''),
    city: String(data.city || ''),
    locality: String(data.locality || ''),
    state: String(data.state || ''),
    postalCode: String(data.postalCode || ''),
    streetLine: String(data.streetLine || ''),
    raw: data.raw,
    source: 'nominatim',
  };
}

function mockReverseGeocode(lat, lng) {
  return {
    latitude: lat,
    longitude: lng,
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)} (mock — enable backend or location services)`,
    country: 'United States',
    countryCode: 'US',
    city: 'Demo City',
    locality: 'Demo neighborhood',
    state: '',
    postalCode: '',
    streetLine: '',
    raw: null,
    source: 'mock',
  };
}
