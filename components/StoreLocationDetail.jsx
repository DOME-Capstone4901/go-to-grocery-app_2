import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette, shadows } from '../utils/theme';

/**
 * Full location readout for a store from search / map selection.
 */
export default function StoreLocationDetail({ store, onClose, onDirections, onMaps, onShop }) {
  if (!store) return null;

  const brand = String(store.brand || '')
    .replace(/^./, c => c.toUpperCase());
  const name = String(store.name || 'Store');
  const address = String(store.address || '').trim() || 'Address not available from search';
  const miles = store.miles != null ? `~${store.miles} mi from search center` : null;
  const la = Number(store.lat);
  const ln = Number(store.lng);
  const coords =
    Number.isFinite(la) && Number.isFinite(ln)
      ? `${la.toFixed(5)}, ${ln.toFixed(5)}`
      : '—';
  const pid = store.placeId != null ? String(store.placeId) : '';
  const placeIdShort = pid.length > 48 ? `${pid.slice(0, 24)}…${pid.slice(-12)}` : pid || '—';

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Store details</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>{brand}</Text>
        <Text style={styles.name}>{name}</Text>

        <Text style={styles.sectionLabel}>Address</Text>
        <Text style={styles.body}>{address}</Text>

        {miles ? (
          <>
            <Text style={styles.sectionLabel}>Distance</Text>
            <Text style={styles.body}>{miles}</Text>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Coordinates (lat, lng)</Text>
        <Text style={styles.mono}>{coords}</Text>

        <Text style={styles.sectionLabel}>Place ID</Text>
        <Text style={styles.monoSmall} selectable>
          {placeIdShort}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.btnOrange} onPress={onDirections}>
          <Text style={styles.btnOrangeText}>Directions</Text>
        </Pressable>
        <Pressable style={styles.btnGreen} onPress={onMaps}>
          <Text style={styles.btnGreenText}>Open in Maps</Text>
        </Pressable>
        <Pressable style={styles.btnShop} onPress={onShop}>
          <Text style={styles.btnShopText}>Shop this store</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    maxHeight: 340,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  close: {
    fontSize: 20,
    color: palette.muted,
    fontWeight: '600',
  },
  scroll: {
    maxHeight: 200,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brand: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.greenDeep,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  mono: {
    fontSize: 14,
    color: palette.muted,
    fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  monoSmall: {
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
    fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  btnOrange: {
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnOrangeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnGreen: {
    backgroundColor: palette.greenDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnGreenText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnShop: {
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  btnShopText: { color: palette.text, fontWeight: '700', fontSize: 13 },
});
