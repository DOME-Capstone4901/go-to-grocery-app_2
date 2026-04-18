import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { palette, shadows } from '../../utils/theme';

function StoreCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name || 'Store'}</Text>
      <Text style={styles.category}>{item.category || 'Retail'}</Text>
      <Text style={styles.addr} numberOfLines={2}>
        {item.address || '—'}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.dist}>
          {item.distanceKm != null ? `${item.distanceKm} km` : '—'}
        </Text>
        <Text style={styles.coords} numberOfLines={1}>
          {item.lat != null && item.lng != null
            ? `${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}`
            : ''}
        </Text>
      </View>
    </View>
  );
}

export default function NearbyStoresList({
  stores = [],
  loading,
  emptyHint = 'No stores in this radius.',
  header,
  ListHeaderComponent,
  /** When true, render a column (for use inside a parent ScrollView). */
  embedded = false,
}) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={palette.orange} />
        <Text style={styles.loadingText}>Searching nearby stores…</Text>
      </View>
    );
  }

  if (embedded) {
    return (
      <View>
        {ListHeaderComponent ? <ListHeaderComponent /> : null}
        {header ? <Text style={styles.listHeader}>{header}</Text> : null}
        {stores.length === 0 ? (
          <View style={styles.emptyInner}>
            <Text style={styles.emptyText}>{emptyHint}</Text>
          </View>
        ) : (
          stores.map((item, index) => (
            <StoreCard key={String(item.id ?? item.placeId ?? index)} item={item} />
          ))
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={stores}
      keyExtractor={(item, index) => String(item.id ?? item.placeId ?? index)}
      ListHeaderComponent={
        ListHeaderComponent
          ? ListHeaderComponent
          : header
            ? () => <Text style={styles.listHeader}>{header}</Text>
            : null
      }
      contentContainerStyle={stores.length === 0 ? styles.emptyContainer : styles.listContent}
      scrollEnabled={stores.length > 4}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <StoreCard item={item} />}
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Text style={styles.emptyText}>{emptyHint}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: palette.muted, fontWeight: '600' },
  listHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.greenDeep,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 120,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
    ...shadows.card,
  },
  name: { fontSize: 16, fontWeight: '800', color: palette.text },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.orange,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  addr: { fontSize: 14, color: palette.text, marginTop: 6, lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  dist: { fontSize: 13, fontWeight: '700', color: palette.greenDeep },
  coords: { fontSize: 11, color: palette.muted, flex: 1, marginLeft: 12, textAlign: 'right' },
  emptyInner: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: palette.muted, textAlign: 'center' },
});
