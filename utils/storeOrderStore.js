import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'store_orders_v1';
const MAX_ORDERS = 50;

let orders = [];

export async function loadStoreOrders() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    orders = raw ? JSON.parse(raw) : [];
  } catch {
    orders = [];
  }
  return orders;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(orders.slice(0, MAX_ORDERS)));
}

export function getStoreOrders() {
  return orders;
}

/**
 * Persists a completed checkout (demo — no payment processor).
 */
export function saveCheckoutOrder({ lines, subtotal, note }) {
  const id = `ord-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const entry = {
    id,
    createdAt,
    subtotal: Number(subtotal) || 0,
    itemCount: lines.reduce((s, l) => s + (l.quantity || 0), 0),
    lines: lines.map(l => ({
      productName: l.productName,
      storeName: l.storeName,
      brand: l.brand,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: (l.unitPrice || 0) * (l.quantity || 0),
    })),
    note: note || '',
  };
  orders = [entry, ...orders].slice(0, MAX_ORDERS);
  save();
  return entry;
}
