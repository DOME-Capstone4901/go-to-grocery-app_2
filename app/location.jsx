import React, { useMemo, useState, useEffect, useRef } from 'react'
import {Link} from 'expo-router'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { WebView } from 'react-native-webview'

const GROCERY_ITEMS = [
  { id: '1', name: 'Milk', category: 'Dairy' },
  { id: '2', name: 'Eggs', category: 'Dairy' },
  { id: '3', name: 'Bread', category: 'Bakery' },
  { id: '4', name: 'Rice', category: 'Grains' },
  { id: '5', name: 'Chicken Breast', category: 'Meat' },
  { id: '6', name: 'Apples', category: 'Produce' },
  { id: '7', name: 'Bananas', category: 'Produce' },
  { id: '8', name: 'Tomatoes', category: 'Produce' },
  { id: '9', name: 'Onions', category: 'Produce' },
  { id: '10', name: 'Pasta', category: 'Pantry' },
  { id: '11', name: 'Olive Oil', category: 'Pantry' },
  { id: '12', name: 'Yogurt', category: 'Dairy' },
  { id: '13', name: 'Cheddar Cheese', category: 'Dairy' },
  { id: '14', name: 'Spinach', category: 'Produce' },
  { id: '15', name: 'Salmon', category: 'Meat' },
]

function uniq(arr) {
  return Array.from(new Set(arr))
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [recent, setRecent] = useState([])
  const [sortAZ, setSortAZ] = useState(true)
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const mapWebViewRef = useRef(null)
  const modalMapWebViewRef = useRef(null)

  const categories = useMemo(() => {
    return ['All', ...uniq(GROCERY_ITEMS.map((i) => i.category)).sort()]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list = GROCERY_ITEMS

    if (selectedCategory !== 'All') {
      list = list.filter((i) => i.category === selectedCategory)
    }

    if (q) {
      list = list.filter((i) => {
        const hay = `${i.name} ${i.category}`.toLowerCase()
        return hay.includes(q)
      })
    }

    list = [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name)
      return sortAZ ? cmp : -cmp
    })

    return list
  }, [query, selectedCategory, sortAZ])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const starts = GROCERY_ITEMS.filter((i) => i.name.toLowerCase().startsWith(q))
    const contains = GROCERY_ITEMS.filter(
      (i) => !i.name.toLowerCase().startsWith(q) && i.name.toLowerCase().includes(q)
    )
    return [...starts, ...contains].slice(0, 5)
  }, [query])

  const cartCount = cart.length

  const toggleCart = (itemId) => {
    setCart((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const pushRecent = (text) => {
    const t = text.trim()
    if (!t) return
    setRecent((prev) => [t, ...prev.filter((x) => x !== t)].slice(0, 6))
  }

  const onSubmitSearch = () => pushRecent(query)

  const onRefresh = async () => {
    setRefreshing(true)
    await getCurrentLocation()
    setRefreshing(false)
  }

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true)
      let { status } = await Location.requestForegroundPermissionsAsync()
      console.log('📍 Location permission status:', status)
      
      if (status !== 'granted') {
        const defaultLocation = {
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
        console.log('⚠️ Location permission denied. Using default location:')
        console.log('   Latitude:', defaultLocation.latitude)
        console.log('   Longitude:', defaultLocation.longitude)
        setLocation(defaultLocation)
        setLocationError('Using default location')
        setLoadingLocation(false)
        return
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      
      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      
      console.log('✅ Location captured successfully:')
      console.log('   Latitude:', locationData.latitude)
      console.log('   Longitude:', locationData.longitude)
      console.log('   Full location object:', JSON.stringify(locationData, null, 2))
      console.log('   Raw coordinates:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        altitude: currentLocation.coords.altitude,
        heading: currentLocation.coords.heading,
        speed: currentLocation.coords.speed,
      })
      
      setLocation(locationData)
      setLoadingLocation(false)
      
      if (mapWebViewRef.current) {
        mapWebViewRef.current.injectJavaScript(`
          (function() {
            try {
              var lat = ${locationData.latitude};
              var lng = ${locationData.longitude};
              if (window.map && window.marker) {
                window.map.setView([lat, lng], window.map.getZoom());
                window.marker.setLatLng([lat, lng]);
                window.marker.openPopup();
              }
            } catch(e) {
              console.error('Error updating map:', e);
            }
          })();
          true;
        `)
      }
    } catch (error) {
      const defaultLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      console.error('❌ Error getting location:', error)
      console.log('⚠️ Using default location due to error:')
      console.log('   Latitude:', defaultLocation.latitude)
      console.log('   Longitude:', defaultLocation.longitude)
      setLocation(defaultLocation)
      setLocationError('Using default location')
      setLoadingLocation(false)
    }
  }

  useEffect(() => {
    getCurrentLocation()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Grocery Search</Text>
          <Text style={styles.subtitle}>Find items fast • add to list</Text>
        </View>

        <Pressable style={styles.cartPill} onPress={() => router.push({ pathname: '/details', params: { cartCount } })}>
          <Text style={styles.cartText}>List: {cartCount}</Text>
        </Pressable>
        <Link href="/filter">Filter</Link>
      </View>

      <View style={styles.mapContainer}>
        {loadingLocation ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.mapLoadingText}>Loading location...</Text>
          </View>
        ) : location ? (
          <View style={{ flex: 1, position: 'relative' }}>
            <WebView
              ref={mapWebViewRef}
              key={`map-${location.latitude}-${location.longitude}`}
              style={styles.map}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        html, body { width: 100%; height: 100%; overflow: hidden; }
                        #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script>
                        (function() {
                          try {
                            var lat = ${location.latitude};
                            var lng = ${location.longitude};
                            var map = L.map('map', {
                              zoomControl: true,
                              dragging: true,
                              touchZoom: true,
                              doubleClickZoom: true,
                              scrollWheelZoom: false,
                              boxZoom: false,
                              keyboard: false
                            }).setView([lat, lng], 15);
                            
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '© OpenStreetMap',
                              maxZoom: 19
                            }).addTo(map);
                            
                            var marker = L.marker([lat, lng], {
                              draggable: false
                            }).addTo(map);
                            marker.bindPopup('Your Location').openPopup();
                            
                            window.map = map;
                            window.marker = marker;
                          } catch(e) {
                            document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Map loading...</div>';
                          }
                        })();
                      </script>
                    </body>
                  </html>
                `,
              }}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="small" color="#111" />
                </View>
              )}
            />
            <View style={styles.mapButtonsContainer}>
              <Pressable 
                style={styles.mapCurrentLocationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.mapButtonText}>📍 Current</Text>
              </Pressable>
              <Pressable 
                style={styles.mapEditButton}
                onPress={() => {
                  setSelectedLocation(location)
                  setShowLocationModal(true)
                }}
              >
                <Text style={styles.mapButtonText}>📍 Change</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.mapLoading}>
            <Text style={styles.mapErrorText}>Unable to load map</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </Pressable>
          </View>
          
          <View style={styles.modalMapContainer}>
            {selectedLocation ? (
              <WebView
                ref={modalMapWebViewRef}
                style={styles.modalMap}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          html, body { width: 100%; height: 100%; overflow: hidden; }
                          #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
                          .center-marker {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -100%);
                            z-index: 1000;
                            pointer-events: none;
                            font-size: 40px;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                          }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <div class="center-marker">📍</div>
                        <script>
                          (function() {
                            try {
                              var lat = ${selectedLocation.latitude};
                              var lng = ${selectedLocation.longitude};
                              var map = L.map('map', {
                                zoomControl: true,
                                dragging: true,
                                touchZoom: true,
                                doubleClickZoom: true,
                                scrollWheelZoom: false,
                                boxZoom: false,
                                keyboard: false
                              }).setView([lat, lng], 15);
                              
                              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap',
                                maxZoom: 19
                              }).addTo(map);
                              
                              var marker = L.marker([lat, lng], {
                                draggable: true
                              }).addTo(map);
                              marker.bindPopup('Selected Location').openPopup();
                              
                              function sendLocation(lat, lng) {
                                if (window.ReactNativeWebView) {
                                  window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'location',
                                    latitude: lat,
                                    longitude: lng
                                  }));
                                }
                              }
                              
                              var centerMarker = marker;
                              map.on('moveend', function() {
                                var center = map.getCenter();
                                centerMarker.setLatLng([center.lat, center.lng]);
                                centerMarker.openPopup();
                                sendLocation(center.lat, center.lng);
                              });
                              
                              marker.on('dragend', function() {
                                var pos = marker.getLatLng();
                                map.setView([pos.lat, pos.lng], map.getZoom());
                                sendLocation(pos.lat, pos.lng);
                              });
                              
                              sendLocation(lat, lng);
                            } catch(e) {
                              document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Map loading...</div>';
                            }
                          })();
                        </script>
                      </body>
                    </html>
                  `,
                }}
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data)
                    if (data.type === 'location') {
                      setSelectedLocation({
                        latitude: data.latitude,
                        longitude: data.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      })
                      console.log('📍 Location selected in modal:')
                      console.log('   Latitude:', data.latitude)
                      console.log('   Longitude:', data.longitude)
                    }
                  } catch (e) {
                    console.error('Error parsing message:', e)
                  }
                }}
                injectedJavaScript={`
                  (function() {
                    window.ReactNativeWebView = window.ReactNativeWebView || {
                      postMessage: function(data) {
                        window.postMessage(data, '*');
                      }
                    };
                  })();
                  true;
                `}
              />
            ) : null}
          </View>
          
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.modalConfirmButton}
              onPress={() => {
                if (selectedLocation) {
                  setLocation(selectedLocation)
                  console.log('✅ Location updated:')
                  console.log('   Latitude:', selectedLocation.latitude)
                  console.log('   Longitude:', selectedLocation.longitude)
                }
                setShowLocationModal(false)
              }}
            >
              <Text style={styles.modalConfirmButtonText}>Confirm Location</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search items (milk, apple, pasta...)"
        placeholderTextColor="#888"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitSearch}
        returnKeyType="search"
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={styles.suggestRow}
              onPress={() => {
                setQuery(s.name)
                pushRecent(s.name)
              }}
            >
              <Text style={styles.suggestText}>{s.name}</Text>
              <Text style={styles.suggestMuted}>{s.category}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {recent.map((r) => (
              <Pressable key={r} style={styles.chip} onPress={() => setQuery(r)}>
                <Text style={styles.chipText}>{r}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.chip, styles.chipDark]} onPress={() => setRecent([])}>
              <Text style={[styles.chipText, styles.chipTextDark]}>Clear</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((c) => {
            const active = c === selectedCategory
            return (
              <Pressable
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <View style={styles.controlsRow}>
        <Text style={styles.metaText}>
          Showing {filtered.length} / {GROCERY_ITEMS.length}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.smallBtn} onPress={() => setSortAZ((v) => !v)}>
            <Text style={styles.smallBtnText}>{sortAZ ? 'A–Z' : 'Z–A'}</Text>
          </Pressable>

          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              setQuery('')
              setSelectedCategory('All')
            }}
          >
            <Text style={styles.smallBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111"
            colors={['#111']}
          />
        }
        renderItem={({ item }) => {
          const inCart = cart.includes(item.id)
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/details',
                  params: { name: item.name, category: item.category, inCart: inCart ? 'yes' : 'no' },
                })
              }
            >
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>

              <Pressable
                style={[styles.addBtn, inCart && styles.addBtnActive]}
                onPress={() => toggleCart(item.id)}
              >
                <Text style={[styles.addBtnText, inCart && styles.addBtnTextActive]}>
                  {inCart ? 'Added' : 'Add'}
                </Text>
              </Pressable>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches. Try another search.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },

  headerRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#666' },
  cartPill: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cartText: { color: '#fff', fontWeight: '700' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  suggestBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestText: { fontWeight: '700' },
  suggestMuted: { color: '#666' },

  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },

  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { fontWeight: '600' },
  chipActive: { backgroundColor: '#111' },
  chipTextActive: { color: '#fff' },
  chipDark: { backgroundColor: '#111' },
  chipTextDark: { color: '#fff' },

  controlsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: { color: '#666' },
  smallBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },

  list: { paddingTop: 12, paddingBottom: 24 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: { fontSize: 16, fontWeight: '700' },
  itemCategory: { marginTop: 2, color: '#666' },

  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  addBtnActive: { backgroundColor: '#111' },
  addBtnText: { fontWeight: '700' },
  addBtnTextActive: { color: '#fff' },

  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { color: '#666' },

  mapContainer: {
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  mapLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  mapErrorText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  mapButtonsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1000,
  },
  mapCurrentLocationButton: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapEditButton: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalMapContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  modalMap: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
