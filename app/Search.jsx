import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addToGroceryList, getGroceryList } from '../utils/groceryStore';
import StoreAreaMap from '../components/StoreAreaMap';
import StoreLocationDetail from '../components/StoreLocationDetail';
import {
  fetchGeocodeSuggestions,
  fetchGroceryChainStores,
  mapsDrivingDirectionsUrl,
  mapsUrlForPlace,
  resolveSearchToLocation,
} from '../utils/groceryPlaces';
import { isLatLngInsideUnitedStates } from '../utils/usBounds';
import {
  GROCERY_CATALOG,
  filterGroceryByQuery,
  getGrocerySuggestions,
} from '../utils/groceryCatalog';
import { searchUsZipCodes } from '../utils/locationSearch';
import { getStoreCartCount } from '../utils/storeCartStore';
import { getUserLatLng } from '../utils/geoLocation';
import { palette, shadows } from '../utils/theme';

function uniq(arr) {
  return Array.from(new Set(arr));
}

function storeLocationSortKey(s) {
  const addr = String(s?.address || '').trim().toLowerCase();
  if (addr) return addr;
  return String(s?.name || '').trim().toLowerCase();
}

function storeRowKey(s, index) {
  if (s?.id != null) return String(s.id);
  if (s?.placeId != null) return String(s.placeId);
  return `store-${index}-${String(s?.lat)}-${String(s?.lng)}`;
}

function isSameStoreRow(selected, row) {
  if (!selected || !row) return false;
  if (selected.id != null && row.id != null) return String(selected.id) === String(row.id);
  if (selected.placeId != null && row.placeId != null) {
    return String(selected.placeId) === String(row.placeId);
  }
  return false;
}

/** Shown until a search or map pan resolves an area (central US). */
const DEFAULT_STORE_MAP_CENTER = { lat: 39.8283, lng: -98.5795 };

/**
 * Texas & New York metro shortcuts. Each tap runs one nearby search — pan the map or pick
 * another city for more stores (APIs return a radius, not every store in a state).
 */
/** Walmart, Kroger, Aldi — matches backend GROCERY_BRANDS. */
const STORE_CHAIN_FILTERS = [
  { id: null, label: 'All chains' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'kroger', label: 'Kroger' },
  { id: 'aldi', label: 'Aldi' },
];

/** Strip backend "(demo …)" labels from store titles; use "nearest" instead. */
function storeLabelForPlaceQuery(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return 'Walmart nearest';
  s = s.replace(/\s*\(demo[^)]*\)/gi, ' nearest');
  s = s.replace(/\s+/g, ' ').trim();
  return s.slice(0, 90);
}

/** After map search: coordinates plus first store label (demo text → nearest). */
function placeQueryFromCoordsAndStores(lat, lng, data) {
  const la = Number(lat);
  const ln = Number(lng);
  const coordStr = `${la.toFixed(5)}, ${ln.toFixed(5)}`;
  const firstName = data?.stores?.[0]?.name?.trim();
  const storePart = storeLabelForPlaceQuery(firstName);
  return `${coordStr} ${storePart}`;
}

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const [searchMode, setSearchMode] = useState('grocery');
  const [query, setQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [groceryStores, setGroceryStores] = useState([]);
  const [areaLabel, setAreaLabel] = useState('');
  const [placesError, setPlacesError] = useState(null);
  const [storeMapCenter, setStoreMapCenter] = useState(DEFAULT_STORE_MAP_CENTER);
  const [storeDemoMode, setStoreDemoMode] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeSearchSeq = useRef(0);
  const mapExploreSeq = useRef(0);
  const nearMeSeqRef = useRef(0);
  const lastMapExploreRef = useRef(null);
  const [mapEpoch, setMapEpoch] = useState(0);
  /** Last GPS fix — used for driving directions to a store. */
  const [userRouteOrigin, setUserRouteOrigin] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recent, setRecent] = useState([]);
  const [sortAZ, setSortAZ] = useState(true);
  const [addedIds, setAddedIds] = useState([]);
  const [listCountsTick, setListCountsTick] = useState(0);
  /** null = all three chains; otherwise show only that brand on map + list. */
  const [storeBrandFilter, setStoreBrandFilter] = useState(null);
  /** Nominatim location rows from GET /places/geocode-suggest (while typing). */
  const [geocodeApiSuggestions, setGeocodeApiSuggestions] = useState([]);
  const geocodeSuggestSeq = useRef(0);
  /** When true, next `placeQuery` change skips the debounced text search (map pin filled the field). */
  const skipPlaceQueryDebounceRef = useRef(false);
  /** Increment to re-run store search for the same `placeQuery` (Refresh). */
  const [placeSearchRerun, setPlaceSearchRerun] = useState(0);
  /** Map tap — store pins show only after user drops this pin. */
  const [userMapPick, setUserMapPick] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setListCountsTick(t => t + 1);
    }, [])
  );

  useEffect(() => {
    const rawQ = params.q;
    const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
    const rawMode = params.mode;
    const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
    if (typeof q !== 'string' || !q.trim()) return;
    const t = q.trim();
    setQuery(t);
    setPlaceQuery(t);
    setSearchMode(mode === 'places' ? 'places' : 'grocery');
  }, [params.q, params.mode]);

  /** When Store finder opens with no text query: use GPS, then nearest stores; always fall back to central US so the API still returns pins. */
  useEffect(() => {
    if (searchMode !== 'places') return undefined;
    const q = placeQuery.trim();
    if (q) return undefined;

    let cancelled = false;
    const seq = ++nearMeSeqRef.current;

    (async () => {
      setPlaceLoading(true);
      setPlacesError(null);
      try {
        const applyStoreResponse = data => {
          setGroceryStores(data.stores || []);
          setStoreMapCenter({
            lat: Number(data.lat),
            lng: Number(data.lng),
          });
          lastMapExploreRef.current = {
            lat: Number(data.lat),
            lng: Number(data.lng),
          };
          setStoreDemoMode(Boolean(data.demo));
          setMapEpoch(e => e + 1);
        };

        const geo = await getUserLatLng();
        if (cancelled || seq !== nearMeSeqRef.current) return;

        if (!geo.ok) {
          setUserRouteOrigin(null);
          const data = await fetchGroceryChainStores({
            lat: DEFAULT_STORE_MAP_CENTER.lat,
            lng: DEFAULT_STORE_MAP_CENTER.lng,
          });
          if (cancelled || seq !== nearMeSeqRef.current) return;
          applyStoreResponse(data);
          setAreaLabel(
            'Location permission off — showing stores near central US. Type a US ZIP or city to search elsewhere.'
          );
          setPlacesError(null);
          return;
        }

        const { lat, lng } = geo;
        setUserRouteOrigin({ lat, lng });
        setStoreMapCenter({ lat, lng });
        lastMapExploreRef.current = { lat, lng };

        if (!isLatLngInsideUnitedStates(lat, lng)) {
          const data = await fetchGroceryChainStores({
            lat: DEFAULT_STORE_MAP_CENTER.lat,
            lng: DEFAULT_STORE_MAP_CENTER.lng,
          });
          if (cancelled || seq !== nearMeSeqRef.current) return;
          applyStoreResponse(data);
          setAreaLabel(
            'Your position is outside the US — sample results near central US. Enter a US ZIP or city for a local search.'
          );
          setPlacesError(null);
          return;
        }

        const data = await fetchGroceryChainStores({ lat, lng });
        if (cancelled || seq !== nearMeSeqRef.current) return;
        applyStoreResponse(data);
        setAreaLabel(
          data.locationLabel || `Near you · ${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}`
        );
        setPlacesError(null);
      } catch (e) {
        if (cancelled || seq !== nearMeSeqRef.current) return;
        setPlacesError(e?.message || String(e));
        setGroceryStores([]);
        setAreaLabel('');
      } finally {
        if (!cancelled && seq === nearMeSeqRef.current) {
          setPlaceLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchMode, placeQuery]);

  /** Avoid "Walmart only" with 0 rows when the real issue is no API data yet. */
  useEffect(() => {
    if (placeLoading) return;
    if (groceryStores.length === 0) {
      setStoreBrandFilter(null);
    }
  }, [placeLoading, groceryStores.length]);

  /** Location autocomplete (free Nominatim via backend) — keep debounce ≥ ~300ms for fair use. */
  useEffect(() => {
    const q = placeQuery.trim();
    const seq = ++geocodeSuggestSeq.current;
    if (q.length < 2) {
      setGeocodeApiSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await fetchGeocodeSuggestions(q);
        if (cancelled || seq !== geocodeSuggestSeq.current) return;
        setGeocodeApiSuggestions(rows);
      } catch {
        if (!cancelled && seq === geocodeSuggestSeq.current) {
          setGeocodeApiSuggestions([]);
        }
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [placeQuery]);

  /** Load stores for the typed area — runs while typing (debounced). */
  useEffect(() => {
    if (skipPlaceQueryDebounceRef.current) {
      skipPlaceQueryDebounceRef.current = false;
      return undefined;
    }
    const seq = ++placeSearchSeq.current;
    const q = placeQuery.trim();
    if (!q) {
      return;
    }
    const isZipTyping = /^\d{1,5}$/.test(q);
    if (q.length < 2 && !isZipTyping) {
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setPlaceLoading(true);
      setPlacesError(null);
      try {
        const resolved = resolveSearchToLocation(q);
        const data = await fetchGroceryChainStores(
          resolved ? { lat: resolved.lat, lng: resolved.lng } : { query: q }
        );
        if (cancelled || seq !== placeSearchSeq.current) return;
        setGroceryStores(data.stores || []);
        setAreaLabel(
          data.locationLabel || resolved?.label || `${Number(data.lat).toFixed(2)}, ${Number(data.lng).toFixed(2)}`
        );
        setStoreMapCenter({
          lat: Number(data.lat),
          lng: Number(data.lng),
        });
        lastMapExploreRef.current = {
          lat: Number(data.lat),
          lng: Number(data.lng),
        };
        setStoreDemoMode(Boolean(data.demo));
        setMapEpoch(e => e + 1);
      } catch (e) {
        if (cancelled || seq !== placeSearchSeq.current) return;
        setPlacesError(e?.message || String(e));
        setGroceryStores([]);
        setAreaLabel('');
        setStoreMapCenter(prev => prev ?? DEFAULT_STORE_MAP_CENTER);
        setStoreDemoMode(false);
      } finally {
        if (!cancelled && seq === placeSearchSeq.current) {
          setPlaceLoading(false);
        }
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [placeQuery, placeSearchRerun]);

  const exploreFromMapCenter = useCallback(async (lat, lng, options = {}) => {
    const force = options.force === true;
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;

    if (!isLatLngInsideUnitedStates(la, ln)) {
      setPlacesError(
        'Pan to a location inside the United States to load stores (US-only).'
      );
      setGroceryStores([]);
      setPlaceLoading(false);
      return null;
    }

    if (!force) {
      const prev = lastMapExploreRef.current;
      if (prev) {
        const delta = Math.abs(prev.lat - la) + Math.abs(prev.lng - ln);
        if (delta < 0.00025) return null;
      }
    }

    const seq = ++mapExploreSeq.current;
    setPlaceLoading(true);
    setPlacesError(null);
    try {
      const data = await fetchGroceryChainStores({ lat: la, lng: ln });
      if (seq !== mapExploreSeq.current) return null;
      setGroceryStores(data.stores || []);
      setAreaLabel(
        data.locationLabel ||
          `${Number(data.lat).toFixed(3)}, ${Number(data.lng).toFixed(3)} · ${force ? 'map (tap)' : 'map'}`
      );
      setStoreMapCenter({
        lat: Number(data.lat),
        lng: Number(data.lng),
      });
      lastMapExploreRef.current = {
        lat: Number(data.lat),
        lng: Number(data.lng),
      };
      setStoreDemoMode(Boolean(data.demo));
      return data;
    } catch (e) {
      if (seq !== mapExploreSeq.current) return null;
      setPlacesError(e?.message || String(e));
      return null;
    } finally {
      if (seq === mapExploreSeq.current) {
        setPlaceLoading(false);
      }
    }
  }, []);

  const handleMapPick = useCallback(
    async (lat, lng) => {
      const la = Number(lat);
      const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
      if (!isLatLngInsideUnitedStates(la, ln)) {
        setPlacesError('Tap inside the United States to search (US-only).');
        return;
      }
      setPlacesError(null);
      setSelectedStore(null);
      setUserMapPick({ lat: la, lng: ln });
      Keyboard.dismiss();

      const data = await exploreFromMapCenter(la, ln, { force: true });
      skipPlaceQueryDebounceRef.current = true;
      setPlaceQuery(placeQueryFromCoordsAndStores(la, ln, data));
    },
    [exploreFromMapCenter]
  );

  const rerunPlaceSearch = useCallback(async () => {
    const q = placeQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    if (
      userMapPick != null &&
      Number.isFinite(Number(userMapPick.lat)) &&
      Number.isFinite(Number(userMapPick.lng))
    ) {
      const la = Number(userMapPick.lat);
      const ln = Number(userMapPick.lng);
      const data = await exploreFromMapCenter(la, ln, { force: true });
      skipPlaceQueryDebounceRef.current = true;
      setPlaceQuery(placeQueryFromCoordsAndStores(la, ln, data));
      return;
    }
    setPlaceSearchRerun(t => t + 1);
  }, [placeQuery, userMapPick, exploreFromMapCenter]);

  const categories = useMemo(
    () => ['All', ...uniq(GROCERY_CATALOG.map(item => item.category)).sort()],
    []
  );

  const filtered = useMemo(() => {
    const list = filterGroceryByQuery(GROCERY_CATALOG, query, selectedCategory);
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAZ ? cmp : -cmp;
    });
  }, [query, selectedCategory, sortAZ]);

  const suggestions = useMemo(
    () => getGrocerySuggestions(query, 10),
    [query]
  );

  const placeSuggestions = useMemo(() => {
    const raw = placeQuery.trim();
    if (!raw) return [];
    return searchUsZipCodes(raw).slice(0, 8);
  }, [placeQuery]);

  /** Single suggestion list: places (API) + ZIP (local). */
  const unifiedSuggestions = useMemo(() => {
    const geo = geocodeApiSuggestions.slice(0, 6).map(row => ({
      kind: 'geo',
      id: `g-${row.id}`,
      title: row.label,
      row,
    }));
    const zip = placeSuggestions.slice(0, 6).map(row => ({
      kind: 'zip',
      id: `z-${row.id}`,
      title: `${row.city}, ${row.state} ${row.zip}`,
      row,
    }));
    return [...geo, ...zip].slice(0, 8);
  }, [geocodeApiSuggestions, placeSuggestions]);

  /** Results limited to Walmart / Kroger / Aldi when a chain chip is selected. */
  const storesInBrandScope = useMemo(() => {
    const all = [...(groceryStores || [])];
    if (!storeBrandFilter) return all;
    return all.filter(s => String(s.brand || '').toLowerCase() === storeBrandFilter);
  }, [groceryStores, storeBrandFilter]);

  const groceryCount = getGroceryList().length;
  void listCountsTick;
  const storeCartCount = getStoreCartCount();

  const mapCenterForView = storeMapCenter ?? DEFAULT_STORE_MAP_CENTER;
  const mapAnchorKey = `${placeQuery.trim() || '__map_default__'}|${mapEpoch}`;

  /** Alphabetical by street address (fallback: name), then distance as tie-breaker. */
  const storesListedByLocation = useMemo(() => {
    const list = [...storesInBrandScope];
    list.sort((a, b) => {
      const cmp = storeLocationSortKey(a).localeCompare(storeLocationSortKey(b), undefined, {
        sensitivity: 'base',
      });
      if (cmp !== 0) return cmp;
      const ma = a.miles != null ? Number(a.miles) : 1e9;
      const mb = b.miles != null ? Number(b.miles) : 1e9;
      return ma - mb;
    });
    return list;
  }, [storesInBrandScope]);

  const brandCountsInArea = useMemo(() => {
    const counts = { walmart: 0, kroger: 0, aldi: 0 };
    for (const s of groceryStores) {
      const b = String(s.brand || '').toLowerCase();
      if (b === 'walmart' || b === 'kroger' || b === 'aldi') {
        counts[b] += 1;
      }
    }
    return counts;
  }, [groceryStores]);

  useEffect(() => {
    if (!selectedStore) return;
    const stillThere = groceryStores.some(s => isSameStoreRow(selectedStore, s));
    if (!stillThere) {
      setSelectedStore(null);
    }
  }, [groceryStores, selectedStore]);

  useEffect(() => {
    if (!selectedStore || !storeBrandFilter) return;
    const b = String(selectedStore.brand || '').toLowerCase();
    if (b !== storeBrandFilter) setSelectedStore(null);
  }, [storeBrandFilter, selectedStore]);

  const handleMapStoreSelect = useCallback(store => {
    if (!store) return;
    if (store.id != null || store.placeId != null) {
      setSelectedStore(store);
    }
  }, []);

  const pushRecent = text => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecent(prev => [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 6));
  };

  const openDrivingDirections = useCallback(
    async item => {
      let oLat = userRouteOrigin?.lat;
      let oLng = userRouteOrigin?.lng;
      if (oLat == null || oLng == null) {
        const g = await getUserLatLng();
        if (g.ok) {
          oLat = g.lat;
          oLng = g.lng;
          setUserRouteOrigin({ lat: g.lat, lng: g.lng });
        }
      }
      const url = mapsDrivingDirectionsUrl({
        originLat: oLat,
        originLng: oLng,
        destLat: item.lat,
        destLng: item.lng,
        placeId: item.placeId,
        name: item.name,
      });
      Linking.openURL(url).catch(() => {});
    },
    [userRouteOrigin]
  );

  /** Opens Google Maps with driving directions to free-text query (store name + address). */
  const openDirectionsFromPlaceQuery = useCallback(async () => {
    const q = placeQuery.trim();
    if (!q) {
      Alert.alert('Enter a place', 'Type a store name and address, then tap Directions.');
      return;
    }
    Keyboard.dismiss();
    let oLat = userRouteOrigin?.lat;
    let oLng = userRouteOrigin?.lng;
    if (oLat == null || oLng == null) {
      const g = await getUserLatLng();
      if (g.ok) {
        oLat = g.lat;
        oLng = g.lng;
        setUserRouteOrigin({ lat: g.lat, lng: g.lng });
      }
    }
    const url = mapsDrivingDirectionsUrl({
      originLat: oLat,
      originLng: oLng,
      destLat: undefined,
      destLng: undefined,
      placeId: undefined,
      name: q,
    });
    Linking.openURL(url).catch(() => {});
  }, [placeQuery, userRouteOrigin]);

  const addItemToList = item => {
    const alreadyExists = getGroceryList().some(
      entry => entry.name.toLowerCase() === item.name.toLowerCase()
    );

    addToGroceryList({ name: item.name, quantity: 1 });
    setAddedIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
    pushRecent(item.name);

    Alert.alert(
      alreadyExists ? 'Updated grocery list' : 'Added to grocery list',
      alreadyExists
        ? `${item.name} quantity was increased in your list.`
        : `${item.name} was added to your grocery list.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>
            {searchMode === 'grocery' ? 'Grocery Search' : 'Store finder'}
          </Text>
          <Text style={styles.subtitle}>
            {searchMode === 'grocery'
              ? 'Find items fast and add them to your list'
              : 'Walmart, Kroger, Aldi — US only'}
          </Text>
        </View>

        <View style={styles.headerPills}>
          <Pressable
            style={styles.cartPill}
            onPress={() => router.push('/groceryList')}
          >
            <Text style={styles.cartText}>List: {groceryCount}</Text>
          </Pressable>
          {searchMode === 'places' ? (
            <Pressable
              style={styles.storeCartPill}
              onPress={() => router.push('/store-checkout')}
            >
              <Text style={styles.cartText}>Cart: {storeCartCount}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, searchMode === 'grocery' && styles.modeChipOn]}
          onPress={() => setSearchMode('grocery')}
        >
          <Text style={[styles.modeChipText, searchMode === 'grocery' && styles.modeChipTextOn]}>
            Groceries
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, searchMode === 'places' && styles.modeChipOn]}
          onPress={() => setSearchMode('places')}
        >
          <Text style={[styles.modeChipText, searchMode === 'places' && styles.modeChipTextOn]}>
            Store finder
          </Text>
        </Pressable>
      </View>

      {searchMode === 'grocery' ? (
        <>
          <View style={styles.searchInputRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Type a letter or keyword…"
              placeholderTextColor="#888"
              style={[styles.input, styles.inputFlex]}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                pushRecent(query);
              }}
              returnKeyType="search"
            />
            <Pressable
              style={styles.searchGoBtn}
              onPress={() => {
                Keyboard.dismiss();
                pushRecent(query);
              }}
            >
              <Text style={styles.searchGoBtnText}>Search</Text>
            </Pressable>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestBox}>
              {suggestions.map(item => (
                <Pressable
                  key={item.id}
                  style={styles.suggestRow}
                  onPress={() => {
                    setQuery(item.name);
                    pushRecent(item.name);
                  }}
                >
                  <Text style={styles.suggestText}>{item.name}</Text>
                  <Text style={styles.suggestMuted}>{item.category}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {recent.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {recent.map(item => (
                  <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}>
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.chip, styles.chipDark]}
                  onPress={() => setRecent([])}
                >
                  <Text style={[styles.chipText, styles.chipTextDark]}>Clear</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {categories.map(category => {
                const active = category === selectedCategory;
                return (
                  <Pressable
                    key={category}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.controlsRow}>
            <Text style={styles.metaText}>
              Showing {filtered.length} / {GROCERY_CATALOG.length}
            </Text>

            <View style={styles.buttonRow}>
              <Pressable style={styles.smallBtn} onPress={() => setSortAZ(value => !value)}>
                <Text style={styles.smallBtnText}>{sortAZ ? 'A-Z' : 'Z-A'}</Text>
              </Pressable>

              <Pressable
                style={styles.smallBtn}
                onPress={() => {
                  setQuery('');
                  setSelectedCategory('All');
                }}
              >
                <Text style={styles.smallBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            style={{ flex: 1 }}
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const added = addedIds.includes(item.id);

              return (
                <View style={styles.row}>
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>

                  <Pressable
                    style={[styles.addBtn, added && styles.addBtnActive]}
                    onPress={() => addItemToList(item)}
                  >
                    <Text style={[styles.addBtnText, added && styles.addBtnTextActive]}>
                      {added ? 'Added' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No matches. Try another search.</Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={storesListedByLocation}
          keyExtractor={(item, index) => storeRowKey(item, index)}
          contentContainerStyle={styles.storeFinderListContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          ListHeaderComponent={
            <>
              <View style={styles.searchInputRow}>
                <TextInput
                  value={placeQuery}
                  onChangeText={setPlaceQuery}
                  placeholder="Store name, street, city…"
                  placeholderTextColor="#888"
                  style={[styles.input, styles.inputFlex]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    void openDirectionsFromPlaceQuery();
                  }}
                />
                <Pressable
                  style={styles.searchGoBtn}
                  onPress={() => {
                    void openDirectionsFromPlaceQuery();
                  }}
                >
                  <Text style={styles.searchGoBtnText}>Directions</Text>
                </Pressable>
                <Pressable
                  style={[styles.refreshBtn, !placeQuery.trim() && styles.refreshBtnDisabled]}
                  onPress={rerunPlaceSearch}
                  disabled={!placeQuery.trim()}
                >
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => {
                    setPlaceQuery('');
                    setGroceryStores([]);
                    setAreaLabel('');
                    setPlacesError(null);
                    setStoreMapCenter(DEFAULT_STORE_MAP_CENTER);
                    setStoreDemoMode(false);
                    lastMapExploreRef.current = null;
                    mapExploreSeq.current += 1;
                    nearMeSeqRef.current += 1;
                    setMapEpoch(e => e + 1);
                    setUserRouteOrigin(null);
                    setSelectedStore(null);
                    setStoreBrandFilter(null);
                    setGeocodeApiSuggestions([]);
                    setUserMapPick(null);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.smallBtnText}>Clear</Text>
                </Pressable>
              </View>

              {unifiedSuggestions.length > 0 ? (
                <View style={styles.suggestBox}>
                  <Text style={styles.suggestHeader}>Suggestions</Text>
                  {unifiedSuggestions.map(sug => (
                    <Pressable
                      key={sug.id}
                      style={styles.suggestRow}
                      onPress={() => {
                        if (sug.kind === 'geo') {
                          setPlaceQuery(sug.row.label);
                          setGeocodeApiSuggestions([]);
                        } else {
                          setPlaceQuery(`${sug.row.city}, ${sug.row.state}`);
                        }
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={styles.suggestText} numberOfLines={2}>
                        {sug.title}
                      </Text>
                      <Text style={styles.suggestMuted}>
                        {sug.kind === 'geo' ? 'Place' : 'ZIP'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.storeMetaLine}>
                {placeLoading
                  ? 'Loading…'
                  : !userMapPick
                    ? `${groceryStores.length} in list · tap the map to search this area`
                    : `${groceryStores.length} nearby · WM ${brandCountsInArea.walmart} · KR ${brandCountsInArea.kroger} · ALDI ${brandCountsInArea.aldi}`}
              </Text>

              <View style={styles.brandFilterBlock}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.brandFilterChipRow}
                >
                  {STORE_CHAIN_FILTERS.map(ch => {
                    const active =
                      ch.id === null ? storeBrandFilter == null : storeBrandFilter === ch.id;
                    return (
                      <Pressable
                        key={String(ch.id ?? 'all')}
                        style={[styles.brandFilterChip, active && styles.brandFilterChipOn]}
                        onPress={() => {
                          setStoreBrandFilter(ch.id);
                          setSelectedStore(null);
                        }}
                      >
                        <Text
                          style={[styles.brandFilterChipText, active && styles.brandFilterChipTextOn]}
                        >
                          {ch.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <StoreAreaMap
                lat={mapCenterForView.lat}
                lng={mapCenterForView.lng}
                autoFitStores={false}
                subtitle={areaLabel || undefined}
                stores={[]}
                mapKey={mapAnchorKey}
                pickLat={userMapPick?.lat}
                pickLng={userMapPick?.lng}
                onMapClick={handleMapPick}
                onStoreSelect={handleMapStoreSelect}
                onStoreDirections={store => {
                  void openDrivingDirections(store);
                }}
              />

              {selectedStore ? (
                <StoreLocationDetail
                  store={selectedStore}
                  onClose={() => setSelectedStore(null)}
                  onDirections={() => {
                    void openDrivingDirections(selectedStore);
                  }}
                  onMaps={() => {
                    Linking.openURL(
                      mapsUrlForPlace({
                        placeId: selectedStore.placeId,
                        name: selectedStore.name,
                        lat: selectedStore.lat,
                        lng: selectedStore.lng,
                      })
                    ).catch(() => {});
                  }}
                  onShop={() =>
                    router.push({
                      pathname: '/store-shop',
                      params: {
                        placeId: String(selectedStore.placeId || selectedStore.id || ''),
                        brand: String(selectedStore.brand || 'walmart').toLowerCase(),
                        storeName: String(selectedStore.name || 'Store'),
                        lat: String(selectedStore.lat ?? ''),
                        lng: String(selectedStore.lng ?? ''),
                      },
                    })
                  }
                />
              ) : null}

              {placesError ? (
                <Text style={styles.errorText}>{placesError}</Text>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                isSameStoreRow(selectedStore, item) ? styles.rowSelected : null,
              ]}
            >
              <Pressable
                style={{ flex: 1, paddingRight: 8 }}
                onPress={() => setSelectedStore(item)}
              >
                <Text style={styles.brandBadge}>
                  {String(item.brand || '')
                    .replace(/^./, s => s.toUpperCase())}
                </Text>
                <Text style={styles.locationLine} numberOfLines={3}>
                  {item.address?.trim()
                    ? item.address
                    : 'No street address in results — map pin shows position'}
                </Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>
                  {item.miles != null ? `~${item.miles} mi` : ''}
                </Text>
              </Pressable>
              <View style={styles.storeRowActions}>
                <Pressable
                  style={styles.directionsBtn}
                  onPress={() => {
                    void openDrivingDirections(item);
                  }}
                >
                  <Text style={styles.directionsBtnText}>Directions</Text>
                </Pressable>
                <Pressable
                  style={styles.shopBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/store-shop',
                      params: {
                        placeId: String(item.placeId || item.id || ''),
                        brand: String(item.brand || 'walmart').toLowerCase(),
                        storeName: String(item.name || 'Store'),
                        lat: String(item.lat ?? ''),
                        lng: String(item.lng ?? ''),
                      },
                    })
                  }
                >
                  <Text style={styles.shopBtnText}>Shop</Text>
                </Pressable>
                <Pressable
                  style={styles.mapBtn}
                  onPress={() => {
                    const url = mapsUrlForPlace({
                      placeId: item.placeId,
                      name: item.name,
                      lat: item.lat,
                      lng: item.lng,
                    });
                    Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Text style={styles.mapBtnText}>Maps</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {placeLoading
                  ? 'Searching…'
                  : groceryStores.length > 0 &&
                      storeBrandFilter &&
                      storesInBrandScope.length === 0
                    ? 'No stores for this chain here — tap All chains or try another area.'
                    : placeQuery.trim()
                      ? 'No stores found — try another ZIP or city.'
                      : 'Type a US ZIP or city, or use the map.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.bg,
    position: 'relative',
    overflow: 'visible',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -28,
    right: -34,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#F8D0B5',
    opacity: 0.24,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 142,
    left: -42,
    width: 126,
    height: 126,
    borderRadius: 999,
    backgroundColor: '#DCE7D4',
    opacity: 0.2,
  },
  headerRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerPills: {
    alignItems: 'flex-end',
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modeChipOn: {
    backgroundColor: palette.greenDeep,
    borderColor: palette.greenDeep,
  },
  modeChipText: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 14,
  },
  modeChipTextOn: {
    color: '#fff',
  },
  storeMetaLine: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    color: palette.muted,
  },
  errorText: {
    marginTop: 8,
    color: palette.peachDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  brandFilterBlock: {
    marginTop: 4,
    marginBottom: 8,
  },
  brandFilterChipRow: {
    gap: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  brandFilterChipOn: {
    backgroundColor: palette.greenDeep,
    borderColor: palette.greenDeep,
  },
  brandFilterChipText: {
    fontWeight: '700',
    fontSize: 13,
    color: palette.text,
  },
  brandFilterChipTextOn: {
    color: '#fff',
  },
  brandBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.orange,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  directionsBtn: {
    alignSelf: 'center',
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    ...shadows.card,
  },
  directionsBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  mapBtn: {
    alignSelf: 'center',
    backgroundColor: palette.greenDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    ...shadows.card,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  title: { fontSize: 30, fontWeight: '800', color: palette.greenDeep, letterSpacing: 0.2 },
  subtitle: { marginTop: 4, color: palette.muted, maxWidth: 230, lineHeight: 20 },
  cartPill: {
    backgroundColor: palette.orange,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  cartText: { color: '#fff', fontWeight: '700' },
  storeCartPill: {
    backgroundColor: palette.greenDeep,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderTopWidth: 1,
    borderTopColor: '#5a8a4a',
    borderBottomWidth: 3,
    borderBottomColor: '#2d4a24',
    ...shadows.card,
  },
  storeRowActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  shopBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    ...shadows.card,
  },
  shopBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
  },
  searchGoBtn: {
    justifyContent: 'center',
    backgroundColor: palette.orange,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
    flexShrink: 0,
    ...shadows.card,
  },
  searchGoBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  refreshBtn: {
    justifyContent: 'center',
    backgroundColor: palette.greenDeep,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#5a8a4a',
    borderBottomWidth: 2,
    borderBottomColor: '#2d4a24',
    flexShrink: 0,
    ...shadows.card,
  },
  refreshBtnDisabled: {
    opacity: 0.45,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  suggestHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: '700',
    color: palette.greenDeep,
  },
  suggestBox: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestText: { fontWeight: '700', color: palette.text },
  suggestMuted: { color: palette.muted },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: palette.greenDeep },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipText: { fontWeight: '600', color: palette.text },
  chipActive: { backgroundColor: palette.greenDeep, borderColor: palette.greenDeep },
  chipTextActive: { color: '#fff' },
  chipDark: { backgroundColor: palette.orange, borderColor: palette.orange },
  chipTextDark: { color: '#fff' },
  controlsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: { color: palette.muted },
  buttonRow: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
    flexShrink: 0,
    ...shadows.card,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingTop: 12, paddingBottom: 24 },
  storeFinderListContent: {
    paddingTop: 0,
    paddingBottom: 32,
    flexGrow: 1,
  },
  locationLine: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  row: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  itemName: { fontSize: 16, fontWeight: '700', color: palette.text },
  itemCategory: { marginTop: 2, color: palette.muted },
  rowSelected: {
    borderColor: palette.greenDeep,
    borderWidth: 2,
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EFE4D8',
  },
  addBtnActive: { backgroundColor: palette.orange },
  addBtnText: { fontWeight: '700', color: palette.text },
  addBtnTextActive: { color: '#fff' },
  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { color: palette.muted },
});
