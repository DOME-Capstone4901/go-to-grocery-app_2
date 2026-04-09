import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatExpirationDate, parseExpirationDate } from './expiration';

const STORAGE_KEY = 'PANTRY';
/** Older standalone screen `app/(tabs)/pantry.jsx` used this key + `expiry` / `qty` fields. */
const LEGACY_STORAGE_KEY = 'PANTRY_ITEMS_V1';

let pantryItems = [];

function normalizePantryItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;

  const id = String(raw.id != null ? raw.id : Date.now());
  const expRaw = raw.expirationDate ?? raw.expiry ?? '';
  const expStr = typeof expRaw === 'string' ? expRaw.trim() : String(expRaw);
  const parsed = parseExpirationDate(expStr);
  const expirationDate = parsed ? formatExpirationDate(parsed) : '';

  const q = Number(raw.quantity ?? raw.qty);
  const quantity = Number.isFinite(q) && q > 0 ? q : 1;

  return {
    id,
    name,
    category: String(raw.category || 'Produce'),
    quantity,
    expirationDate,
  };
}

function normalizeList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizePantryItem).filter(Boolean);
}

// Save pantry to AsyncStorage
async function save() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pantryItems));
  } catch (e) {
    console.log('Error saving pantry:', e);
  }
}

/**
 * Loads pantry from disk and merges legacy `PANTRY_ITEMS_V1` into canonical `PANTRY` shape.
 * Call this on app start and whenever the Pantry tab gains focus so the list stays in sync.
 */
export async function loadPantry() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let list = normalizeList(data ? JSON.parse(data) : []);

    const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacy = normalizeList(JSON.parse(legacyRaw));
        const seen = new Set(list.map(i => i.id));
        for (const item of legacy) {
          if (!seen.has(item.id)) {
            list.push(item);
            seen.add(item.id);
          }
        }
      } catch (e) {
        console.log('Legacy pantry merge:', e);
      }
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    pantryItems = list;
    await save();
  } catch (e) {
    console.log('Error loading pantry:', e);
    pantryItems = [];
  }
}

export function addPantryItem(item) {
  const newItem = {
    id: Date.now().toString(),
    ...item,
  };

  pantryItems.push(newItem);
  save();
  return newItem;
}

export function getPantryItems() {
  return pantryItems;
}

export function updatePantryItem(id, updates) {
  pantryItems = pantryItems.map(item =>
    item.id === id ? { ...item, ...updates } : item
  );
  save();
}

export function deletePantryItem(id) {
  pantryItems = pantryItems.filter(item => item.id !== id);
  save();
}
