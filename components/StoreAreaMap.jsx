import React from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { palette, shadows } from '../utils/theme';

const MAP_HEIGHT = 240;

function directionsUrlForStore(store) {
  const name = encodeURIComponent(store?.name || 'grocery store');
  if (store?.placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination=${name}&destination_place_id=${encodeURIComponent(store.placeId)}&travelmode=driving`;
  }
  if (store?.lat != null && store?.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${store.lat},${store.lng}`)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${name}`;
}

function StoreScroller({ stores = [] }) {
  if (!stores.length) return null;

  const openDirections = store => {
    Linking.openURL(directionsUrlForStore(store)).catch(() => {});
  };

  return (
    <View style={styles.storeChoiceWrap}>
      <View style={styles.storeChoiceHeader}>
        <Text style={styles.storeChoiceTitle}>Swipe stores and tap one for directions</Text>
        <Text style={styles.storeChoiceCount}>{stores.length} choices</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storeScroller}
      >
        {stores.map(store => (
          <Pressable
            key={store.id}
            style={styles.storeChoiceCard}
            onPress={() => openDirections(store)}
          >
            <View style={styles.storeChoiceTop}>
              <Text style={styles.storeBrand} numberOfLines={1}>
                {String(store.brand || '').toUpperCase()}
              </Text>
              <Text style={styles.directionsBadge}>Directions</Text>
            </View>

            <View style={styles.storeTextWrap}>
              <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
              <Text style={styles.storeMeta} numberOfLines={2}>
                {store.address || 'Store location'}
                {store.miles != null ? ` - ~${store.miles} mi` : ''}
              </Text>
              {store.lat != null && store.lng != null ? (
                <Text style={styles.coords}>
                  {Number(store.lat).toFixed(4)}, {Number(store.lng).toFixed(4)}
                </Text>
              ) : null}
            </View>

            <Text style={styles.openDirectionsText}>Open in Google Maps</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Store location preview. On native we can render a WebView map; on web we show
 * a clean store-location list because React Native WebView is not supported.
 */
export default function StoreAreaMap({ lat, lng, subtitle, stores = [] }) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return null;
  }

  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${la},${ln}`)}&z=13&output=embed`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${la},${ln}`)}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></head><body style="margin:0;padding:0;overflow:hidden;background:#dfe5e0"><iframe title="map" width="100%" height="100%" style="border:0;display:block" src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></body></html>`;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{stores.length ? 'Choose a Store' : 'Location'}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.webFallback}>
          <Text style={styles.fallbackText}>
            Tap Walmart, Kroger, or ALDI below to open directions to that exact store.
          </Text>
          <StoreScroller stores={stores} />
          {!stores.length ? (
            <>
              <Text style={styles.coords}>
                {la.toFixed(4)}, {ln.toFixed(4)}
              </Text>
              <Pressable
                style={styles.mapLinkButton}
                onPress={() => Linking.openURL(mapUrl).catch(() => {})}
              >
                <Text style={styles.mapLinkText}>Open Map</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{stores.length ? 'Choose a Store' : 'Location'}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {stores.length ? (
        <View style={styles.nativeStorePanel}>
          <Text style={styles.fallbackText}>
            Tap Walmart, Kroger, or ALDI below to open directions to that exact store.
          </Text>
          <StoreScroller stores={stores} />
        </View>
      ) : (
        <WebView
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.greenDeep,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: palette.muted,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  webview: {
    height: MAP_HEIGHT,
    width: '100%',
    backgroundColor: '#dfe5e0',
  },
  webFallback: {
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#E9EFE6',
    justifyContent: 'center',
  },
  fallbackText: {
    color: palette.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  coords: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  storeChoiceWrap: {
    marginTop: 8,
  },
  storeChoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  storeChoiceTitle: {
    flex: 1,
    color: palette.greenDeep,
    fontSize: 13,
    fontWeight: '800',
  },
  storeChoiceCount: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  storeScroller: {
    gap: 10,
    marginTop: 10,
    paddingRight: 4,
    paddingBottom: 2,
  },
  storeChoiceCard: {
    width: 248,
    minHeight: 138,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  storeChoiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  directionsBadge: {
    backgroundColor: palette.greenDeep,
    borderRadius: 999,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  storeTextWrap: {
    flex: 1,
  },
  storeBrand: {
    color: palette.orange,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  storeName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  storeMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  openDirectionsText: {
    color: palette.greenDeep,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  nativeStorePanel: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#E9EFE6',
  },
  mapLinkButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.greenDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mapLinkText: {
    color: '#fff',
    fontWeight: '800',
  },
});
