# Live map explorer

## File structure

| Path | Role |
|------|------|
| `app/(tabs)/mapExplorer.jsx` | **Map screen** — composes map, trackers, radius, lists, modal |
| `components/map-explorer/LiveTrackedMap.jsx` | Leaflet map (WebView / iframe) + blue trackers + orange store pins |
| `components/map-explorer/MovingDotManager.jsx` | Per-dot **Stop** / **Move** (resume) and selection |
| `components/map-explorer/DotDetailsCard.jsx` | Modal bottom sheet: reverse-geocode fields |
| `components/map-explorer/NearbyStoresList.jsx` | Scrollable list (or embedded column) of stores |
| `hooks/useMovingDots.js` | **MovingDotManager** logic: animation loop, stop/resume/select |
| `utils/geocodingService.js` | Reverse geocode: backend → Expo → mock |
| `utils/nearbyStoresService.js` | Nearby retail: backend → client mock |
| `utils/mockLiveMapData.js` | Offline mock stores around a point |
| `recipe-backend/server.js` | `POST /places/reverse-geocode`, `POST /places/nearby-food-retail` |

## State flow

1. **Mount** — `getUserLatLng()`; on success, `setCenter` + `recenterDots` so trackers orbit the user. Otherwise default center (central US).
2. **`useMovingDots`** — `setInterval` (~130ms) updates each moving dot’s `lat`/`lng` on a small orbit around its anchor. **Stop** freezes coordinates and selects that dot; **Move** sets a new anchor at the frozen point and resumes motion.
3. **Tap a blue pin** or **Stop** — `loadDetailsAndStores(lat, lng)` runs:
   - `reverseGeocodeLatLng` → fills `DotDetailsCard` (modal opens).
   - `fetchNearbyFoodRetail` with `radiusKm * 1000` meters → fills list + map orange pins.
4. **Change radius (1–10 km)** — skips the first effect tick, then refetches **only** nearby stores + geocode for the last selected dot’s position (`selectedRef`).

## API placeholders

- **Reverse geocode:** `POST /places/reverse-geocode` `{ lat, lng }` — Nominatim via backend when `recipe-backend` is running.
- **Nearby retail:** `POST /places/nearby-food-retail` `{ lat, lng, radiusMeters }` — Google Places (if `GOOGLE_MAPS_API_KEY`) or OSM Overpass, else server mock; client also mocks if fetch fails.

Run backend: `npm run recipe-backend` from project root.
