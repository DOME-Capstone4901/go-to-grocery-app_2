import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatMoney } from '../data/storeInventory';
import { getStoreOrders } from '../utils/storeOrderStore';
import { palette, shadows } from '../utils/theme';

export default function StoreOrdersScreen() {
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setTick(t => t + 1);
    }, [])
  );

  void tick;
  const orders = getStoreOrders();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Saved orders</Text>
      <Text style={styles.sub}>Checkout history on this device (demo).</Text>

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>

      {orders.length === 0 ? (
        <Text style={styles.empty}>No orders yet. Checkout from the store cart.</Text>
      ) : (
        orders.map(order => (
          <View key={order.id} style={styles.card}>
            <Text style={styles.orderId}>{order.id}</Text>
            <Text style={styles.date}>
              {new Date(order.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.total}>
              {formatMoney(order.subtotal)} · {order.itemCount} items
            </Text>
            {order.lines?.map((line, i) => (
              <Text key={i} style={styles.line}>
                {line.quantity}× {line.productName} @ {line.storeName} ({line.brand}) —{' '}
                {formatMoney(line.lineTotal)}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: palette.greenDeep },
  sub: { marginTop: 6, color: palette.muted, marginBottom: 12 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  backBtnText: { fontWeight: '800', color: palette.orange },
  empty: { color: palette.muted, marginTop: 20 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  orderId: { fontSize: 12, color: palette.muted, fontWeight: '600' },
  date: { marginTop: 4, fontWeight: '700', color: palette.text },
  total: { marginTop: 8, fontSize: 16, fontWeight: '800', color: palette.greenDeep },
  line: { marginTop: 6, color: palette.muted, fontSize: 13, lineHeight: 18 },
});
