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
import {
  fetchGroceryChainStores,
  mapsUrlForPlace,
  resolveSearchToLocation,
} from '../utils/groceryPlaces';
import {
  GROCERY_CATALOG,
  filterGroceryByQuery,
  getGrocerySuggestions,
} from '../utils/groceryCatalog';
import { searchUsZipCodes } from '../utils/locationSearch';
import { getStoreCartCount } from '../utils/storeCartStore';
import { palette, shadows } from '../utils/theme';

function uniq(arr) {
  return Array.from(new Set(arr));
}

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const [searchMode, setSearchMode] = useState('grocery');
  const [query, setQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [groceryStores, setGroceryStores] = useState([]);
  const [areaLabel, setAreaLabel] = useState('');
  const [placesError, setPlacesError] = useState(null);
  const [storeMapCenter, setStoreMapCenter] = useState(null);
  const [storeDemoMode, setStoreDemoMode] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeSearchSeq = useRef(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recent, setRecent] = useState([]);
  const [sortAZ, setSortAZ] = useState(true);
  const [addedIds, setAddedIds] = useState([]);
  const [listCountsTick, setListCountsTick] = useState(0);

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

  useEffect(() => {
    const seq = ++placeSearchSeq.current;
    const q = placeQuery.trim();
    if (!q) {
      setGroceryStores([]);
      setAreaLabel('');
      setPlacesError(null);
      setStoreMapCenter(null);
      setStoreDemoMode(false);
      setPlaceLoading(false);
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
        setStoreDemoMode(Boolean(data.demo));
      } catch (e) {
        if (cancelled || seq !== placeSearchSeq.current) return;
        setPlacesError(e?.message || String(e));
        setGroceryStores([]);
        setAreaLabel('');
        setStoreMapCenter(null);
        setStoreDemoMode(false);
      } finally {
        if (!cancelled && seq === placeSearchSeq.current) {
          setPlaceLoading(false);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [placeQuery]);

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

  const groceryCount = getGroceryList().length;
  void listCountsTick;
  const storeCartCount = getStoreCartCount();

  const pushRecent = text => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecent(prev => [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 6));
  };

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
            {searchMode === 'grocery' ? 'Grocery Search' : 'Walmart · Kroger · Aldi'}
          </Text>
          <Text style={styles.subtitle}>
            {searchMode === 'grocery'
              ? 'Find items fast and add them to your list'
              : 'ZIP or city + state finds the area; stores use Google Places (backend API key).'}
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
        <>
          <View style={styles.searchInputRow}>
            <TextInput
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder="ZIP, city, or one letter…"
              placeholderTextColor="#888"
              style={[styles.input, styles.inputFlex]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Pressable style={styles.searchGoBtn} onPress={() => Keyboard.dismiss()}>
              <Text style={styles.searchGoBtnText}>Search</Text>
            </Pressable>
          </View>

          {placeSuggestions.length > 0 && (
            <View style={styles.suggestBox}>
              <Text style={styles.suggestHeader}>Suggestions (ZIP / city)</Text>
              {placeSuggestions.map(row => (
                <Pressable
                  key={row.id}
                  style={styles.suggestRow}
                  onPress={() => {
                    setPlaceQuery(`${row.city}, ${row.state}`);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.suggestText}>
                    {row.city}, {row.state} {row.zip}
                  </Text>
                  <Text style={styles.suggestMuted}>Tap to search</Text>
                </Pressable>
              ))}
            </View>
          )}

          {areaLabel ? (
            <Text style={styles.areaHint} numberOfLines={2}>
              Area: {areaLabel}
            </Text>
          ) : null}

          {placesError ? (
            <Text style={styles.errorText}>{placesError}</Text>
          ) : null}

          {storeMapCenter && !placesError ? (
            <StoreAreaMap
              lat={storeMapCenter.lat}
              lng={storeMapCenter.lng}
              subtitle={areaLabel || undefined}
            />
          ) : null}

          <View style={styles.controlsRow}>
            <Text style={styles.metaText}>
              {placeLoading
                ? 'Loading stores…'
                : `${groceryStores.length} store${groceryStores.length === 1 ? '' : 's'} (Walmart, Kroger, Aldi)`}
            </Text>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                setPlaceQuery('');
                setGroceryStores([]);
                setAreaLabel('');
                setPlacesError(null);
                setStoreMapCenter(null);
                setStoreDemoMode(false);
              }}
            >
              <Text style={styles.smallBtnText}>Clear</Text>
            </Pressable>
          </View>

          {storeDemoMode ? (
            <Text style={styles.demoBanner}>
              Demo mode: pins are placeholders. Add GOOGLE_MAPS_API_KEY to recipe-backend/.env for real
              Walmart / Kroger / Aldi from Google Places.
            </Text>
          ) : null}

          <FlatList
            data={groceryStores}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.brandBadge}>
                    {String(item.brand || '')
                      .replace(/^./, s => s.toUpperCase())}
                  </Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>
                    {item.address || 'Address on map'}
                    {item.miles != null ? ` · ~${item.miles} mi` : ''}
                  </Text>
                </View>
                <View style={styles.storeRowActions}>
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
                    : placeQuery.trim()
                      ? 'No Walmart, Kroger, or Aldi found in that area (try another ZIP or city).'
                      : 'Enter a US ZIP or city + state. Run recipe-backend with GOOGLE_MAPS_API_KEY and set EXPO_PUBLIC_RECIPE_API_URL.'}
                </Text>
              </View>
            }
          />
        </>
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
    overflow: 'hidden',
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
  areaHint: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 8,
    color: palette.peachDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  demoBanner: {
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  brandBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.orange,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
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
    paddingHorizontal: 16,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  searchGoBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
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
    ...shadows.card,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingTop: 12, paddingBottom: 24 },
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
