import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'store_cart_v1';

let cart = [];

export async function loadStoreCart() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch {
    cart = [];
  }
  return cart;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(cart));
}

export function getStoreCart() {
  return cart;
}

export function getStoreCartCount() {
  return cart.reduce((s, line) => s + (line.quantity || 0), 0);
}

export function cartLineTotal(line) {
  return (line.unitPrice || 0) * (line.quantity || 0);
}

export function cartSubtotal() {
  return cart.reduce((s, line) => s + cartLineTotal(line), 0);
}

/**
 * @param {object} line - productId, productName, brand, storeName, placeId, unitPrice, quantity
 */
export function addToStoreCart(line) {
  const productId = String(line.productId || '');
  const placeId = String(line.placeId || '');
  const qty = Math.max(1, Number(line.quantity) || 1);
  const unitPrice = Number(line.unitPrice);
  if (!productId || !Number.isFinite(unitPrice)) return null;

  const existing = cart.find(
    x => x.productId === productId && x.placeId === placeId
  );
  if (existing) {
    existing.quantity = (existing.quantity || 0) + qty;
    save();
    return existing;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    productId,
    productName: String(line.productName || 'Item'),
    brand: String(line.brand || ''),
    storeName: String(line.storeName || ''),
    placeId,
    unitPrice,
    quantity: qty,
    unit: line.unit || 'ea',
  };
  cart.push(row);
  save();
  return row;
}

export function updateStoreCartLine(lineId, quantity) {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q < 1) {
    removeStoreCartLine(lineId);
    return;
  }
  cart = cart.map(row =>
    row.id === lineId ? { ...row, quantity: q } : row
  );
  save();
}

export function removeStoreCartLine(lineId) {
  cart = cart.filter(row => row.id !== lineId);
  save();
}

export function clearStoreCart() {
  cart = [];
  save();
}
