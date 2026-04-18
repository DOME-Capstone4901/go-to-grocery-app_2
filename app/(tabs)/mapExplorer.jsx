import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import LiveTrackedMap from '../../components/map-explorer/LiveTrackedMap';
import MovingDotManager from '../../components/map-explorer/MovingDotManager';
import DotDetailsCard from '../../components/map-explorer/DotDetailsCard';
import NearbyStoresList from '../../components/map-explorer/NearbyStoresList';
import { useMovingDots } from '../../hooks/useMovingDots';
import { reverseGeocodeLatLng } from '../../utils/geocodingService';
import { fetchNearbyFoodRetail } from '../../utils/nearbyStoresService';
import { getUserLatLng } from '../../utils/geoLocation';
import { palette } from '../../utils/theme';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const RADII_KM = [1, 3, 5, 10];

/**
 * Map explorer: animated blue trackers, stop → reverse geocode + radius-based nearby retail search.
 * State flow: GPS/default center → moving dots → stop or tap → fetch address + stores → optional radius change refetch.
 */
export default function MapExplorerScreen() {
  const insets = useSafeAreaInsets();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [locationHint, setLocationHint] = useState(null);

  const { dots, selectedDot, stopDot, resumeDot, selectDot, recenterDots } = useMovingDots(
    center.lat,
    center.lng
  );

  const [radiusKm, setRadiusKm] = useState(3);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [nearbyStores, setNearbyStores] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  const [nearbyNote, setNearbyNote] = useState(null);

  const skipRadiusRef = useRef(true);
  const selectedRef = useRef(null);
  selectedRef.current = selectedDot;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await getUserLatLng();
      if (cancelled) return;
      if (g.ok) {
        setCenter({ lat: g.lat, lng: g.lng });
        recenterDots(g.lat, g.lng);
        setMapEpoch(e => e + 1);
        setLocationHint('Using your current position as map center.');
      } else {
        setLocationHint('Location off — demo trackers orbit the central US. Enable location for your area.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recenterDots]);

  const loadDetailsAndStores = useCallback(
    async (lat, lng) => {
      setDetailsVisible(true);
      setDetailLoading(true);
      setNearbyLoading(true);
      setDetailError(null);
      setNearbyError(null);
      setNearbyNote(null);
      try {
        const d = await reverseGeocodeLatLng(lat, lng);
        setDetail(d);
      } catch (e) {
        setDetailError(e?.message || String(e));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
      try {
        const r = await fetchNearbyFoodRetail(lat, lng, radiusKm * 1000);
        setNearbyStores(r.stores || []);
        setNearbyNote(r.note || (r.demo ? 'Demo or fallback data.' : null));
      } catch (e) {
        setNearbyError(e?.message || String(e));
        setNearbyStores([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [radiusKm]
  );

  useEffect(() => {
    if (skipRadiusRef.current) {
      skipRadiusRef.current = false;
      return;
    }
    const s = selectedRef.current;
    if (!s) return;
    void loadDetailsAndStores(s.lat, s.lng);
  }, [radiusKm, loadDetailsAndStores]);

  const handleDotPress = useCallback(
    id => {
      selectDot(id);
      const d = dots.find(x => x.id === id);
      if (d) void loadDetailsAndStores(d.lat, d.lng);
    },
    [dots, selectDot, loadDetailsAndStores]
  );

  const handleStop = useCallback(
    id => {
      const d = dots.find(x => x.id === id);
      const lat = d?.lat;
      const lng = d?.lng;
      stopDot(id);
      if (lat != null && lng != null) void loadDetailsAndStores(lat, lng);
    },
    [dots, stopDot, loadDetailsAndStores]
  );

  const handleResume = useCallback(
    id => {
      resumeDot(id);
    },
    [resumeDot]
  );

  const mapKey = `live-${mapEpoch}-${center.lat.toFixed(3)}-${center.lng.toFixed(3)}`;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={palette.greenDeep} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Live map</Text>
          <Text style={styles.subtitle}>Trackers · reverse geocode · nearby stores</Text>
        </View>
      </View>

      {locationHint ? <Text style={styles.hint}>{locationHint}</Text> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <MovingDotManager
          dots={dots}
          onSelectDot={handleDotPress}
          onStopDot={handleStop}
          onResumeDot={handleResume}
        />

        <Text style={styles.sectionLabel}>Search radius</Text>
        <View style={styles.radiusRow}>
          {RADII_KM.map(km => {
            const on = radiusKm === km;
            return (
              <Pressable
                key={km}
                style={[styles.radiusChip, on && styles.radiusChipOn]}
                onPress={() => setRadiusKm(km)}
              >
                <Text style={[styles.radiusText, on && styles.radiusTextOn]}>{km} km</Text>
              </Pressable>
            );
          })}
        </View>

        <LiveTrackedMap
          mapKey={mapKey}
          centerLat={center.lat}
          centerLng={center.lng}
          dots={dots}
          stores={nearbyStores}
          onDotPress={handleDotPress}
          onStorePress={() => {}}
        />

        <Text style={styles.sectionLabel}>Nearby stores</Text>
        {nearbyNote ? <Text style={styles.note}>{nearbyNote}</Text> : null}
        {nearbyError ? <Text style={styles.err}>{nearbyError}</Text> : null}

        <NearbyStoresList
          stores={nearbyStores}
          loading={nearbyLoading}
          emptyHint="Stop or tap a blue pin, or change radius. No stores in range yet."
          embedded
          header={`${nearbyStores.length} place(s) within ${radiusKm} km`}
        />
      </ScrollView>

      <DotDetailsCard
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        loading={detailLoading}
        error={detailError}
        detail={detail}
        title="Stopped / selected pin"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surfaceAlt },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: { fontSize: 22, fontWeight: '800', color: palette.greenDeep },
  subtitle: { fontSize: 13, color: palette.muted, marginTop: 2 },
  hint: {
    fontSize: 12,
    color: palette.muted,
    paddingHorizontal: 16,
    marginBottom: 8,
    lineHeight: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.greenDeep,
    marginTop: 14,
    marginBottom: 8,
  },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  radiusChipOn: {
    backgroundColor: palette.greenDeep,
    borderColor: palette.greenDeep,
  },
  radiusText: { fontWeight: '700', color: palette.text, fontSize: 13 },
  radiusTextOn: { color: '#fff' },
  note: { fontSize: 12, color: palette.muted, marginBottom: 6 },
  err: { fontSize: 13, color: '#b00020', marginBottom: 8, fontWeight: '600' },
});
