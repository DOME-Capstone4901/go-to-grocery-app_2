import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatMoney } from '../data/storeInventory';
import {
  cartSubtotal,
  clearStoreCart,
  getStoreCart,
  removeStoreCartLine,
  updateStoreCartLine,
  cartLineTotal,
} from '../utils/storeCartStore';
import { saveCheckoutOrder } from '../utils/storeOrderStore';
import { palette, shadows } from '../utils/theme';

export default function StoreCheckoutScreen() {
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setTick(t => t + 1);
    }, [])
  );

  const lines = getStoreCart();
  const subtotal = cartSubtotal();

  const checkout = () => {
    if (!lines.length) return;
    Alert.alert(
      'Place order?',
      `Total ${formatMoney(subtotal)} — saved to your order history (demo).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            saveCheckoutOrder({ lines, subtotal, note: 'Store pickup (demo)' });
            clearStoreCart();
            setTick(t => t + 1);
            Alert.alert('Order saved', 'Your cart is cleared. View history in Orders.');
            router.replace('/store-orders');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store cart</Text>
      <Text style={styles.sub}>Prices are demo examples. Orders are saved on this device only.</Text>

      <View style={styles.rowBtns}>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/store-orders')}>
          <Text style={styles.linkBtnText}>Order history</Text>
        </Pressable>
      </View>

      <FlatList
        data={lines}
        extraData={tick}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Cart is empty. Open Store finder → Shop on a store.</Text>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.storeTag}>{item.storeName}</Text>
            <Text style={styles.lineName}>{item.productName}</Text>
            <Text style={styles.lineMeta}>
              {formatMoney(item.unitPrice)} × {item.quantity} · {item.brand}
            </Text>
            <Text style={styles.lineTotal}>{formatMoney(cartLineTotal(item))}</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  updateStoreCartLine(item.id, item.quantity - 1);
                  setTick(t => t + 1);
                }}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  updateStoreCartLine(item.id, item.quantity + 1);
                  setTick(t => t + 1);
                }}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={styles.removeBtn}
                onPress={() => {
                  removeStoreCartLine(item.id);
                  setTick(t => t + 1);
                }}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {lines.length > 0 ? (
        <View style={styles.footer}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatMoney(subtotal)}</Text>
          <Pressable style={styles.checkoutBtn} onPress={checkout}>
            <Text style={styles.checkoutBtnText}>Checkout & save</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: palette.bg },
  title: { fontSize: 24, fontWeight: '800', color: palette.greenDeep },
  sub: { marginTop: 6, color: palette.muted, lineHeight: 20, marginBottom: 8 },
  rowBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  secondaryBtnText: { fontWeight: '700', color: palette.text },
  linkBtn: { padding: 8 },
  linkBtnText: { fontWeight: '800', color: palette.orange },
  list: { paddingBottom: 120 },
  empty: { color: palette.muted, textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  storeTag: { fontSize: 11, fontWeight: '800', color: palette.orange, marginBottom: 4 },
  lineName: { fontSize: 16, fontWeight: '700', color: palette.text },
  lineMeta: { marginTop: 4, color: palette.muted, fontSize: 13 },
  lineTotal: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  qtyBtn: {
    backgroundColor: palette.surfaceAlt,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  qtyBtnText: { fontSize: 20, fontWeight: '800', color: palette.text },
  qtyNum: { fontWeight: '800', minWidth: 28, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto', padding: 8 },
  removeBtnText: { color: palette.peachDeep, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  totalLabel: { color: palette.muted, fontSize: 13 },
  totalValue: { fontSize: 22, fontWeight: '800', color: palette.greenDeep, marginTop: 4 },
  checkoutBtn: {
    marginTop: 12,
    backgroundColor: palette.greenDeep,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
