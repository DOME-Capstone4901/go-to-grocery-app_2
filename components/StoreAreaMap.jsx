import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { palette, shadows } from '../utils/theme';

const MAP_HEIGHT = 240;

/**
 * Embedded map centered on the search area (Google Maps embed).
 * Works in Expo web and native via WebView iframe.
 */
export default function StoreAreaMap({ lat, lng, subtitle }) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return null;
  }

  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${la},${ln}`)}&z=13&output=embed`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></head><body style="margin:0;padding:0;overflow:hidden;background:#dfe5e0"><iframe title="map" width="100%" height="100%" style="border:0;display:block" src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></body></html>`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Location</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
      />
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
});
