import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  DEMO_INVENTORY,
  formatMoney,
  priceForBrand,
} from '../data/storeInventory';
import { addToStoreCart, getStoreCart } from '../utils/storeCartStore';
import { palette, shadows } from '../utils/theme';

function qtyForProduct(placeId, productId) {
  return getStoreCart()
    .filter(l => l.placeId === placeId && l.productId === productId)
    .reduce((s, l) => s + (l.quantity || 0), 0);
}

export default function StoreShopScreen() {
  const params = useLocalSearchParams();
  const placeId = String(params.placeId || '');
  const brand = String(params.brand || 'walmart').toLowerCase();
  const storeName = String(params.storeName || 'Store');
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setVersion(v => v + 1);
    }, [])
  );

  const bump = () => setVersion(v => v + 1);

  const onAdd = item => {
    const unitPrice = priceForBrand(item, brand);
    addToStoreCart({
      productId: item.id,
      productName: item.name,
      brand,
      storeName,
      placeId,
      unitPrice,
      quantity: 1,
      unit: item.unit,
    });
    bump();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{storeName}</Text>
      <Text style={styles.sub}>
        Demo prices for {brand.replace(/^./, c => c.toUpperCase())} · tap + Add
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/store-checkout')}>
          <Text style={styles.primaryBtnText}>View cart</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Inventory</Text>
      <FlatList
        data={DEMO_INVENTORY}
        keyExtractor={item => item.id}
        extraData={version}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const price = priceForBrand(item, brand);
          const q = qtyForProduct(placeId, item.id);
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.category} · {item.unit}
                </Text>
                <Text style={styles.price}>{formatMoney(price)}</Text>
                {q > 0 ? (
                  <Text style={styles.inCart}>In cart: {q}</Text>
                ) : null}
              </View>
              <Pressable style={styles.addBtn} onPress={() => onAdd(item)}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  sub: { marginTop: 6, color: palette.muted, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  secondaryBtnText: { fontWeight: '700', color: palette.text },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: palette.orange,
    ...shadows.card,
  },
  primaryBtnText: { fontWeight: '800', color: '#fff' },
  section: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '800',
    color: palette.greenDeep,
    fontSize: 16,
  },
  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  itemName: { fontSize: 16, fontWeight: '700', color: palette.text },
  meta: { marginTop: 4, color: palette.muted, fontSize: 13 },
  price: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  inCart: { marginTop: 4, fontSize: 12, fontWeight: '600', color: palette.orange },
  addBtn: {
    backgroundColor: palette.greenDeep,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '800' },
});
