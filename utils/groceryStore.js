import AsyncStorage from '@react-native-async-storage/async-storage';

let grocery = [];
const KEY = 'grocery_list_v1';

export async function loadGroceryList() {
  const raw = await AsyncStorage.getItem(KEY);
  grocery = raw ? JSON.parse(raw) : [];
  return grocery;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(grocery));
}

export function getGroceryList() {
  return grocery;
}

export function addToGroceryList(item) {
  const name = item?.name?.trim();

  if (!name) {
    return;
  }

  const existingItem = grocery.find(
    entry => entry.name.toLowerCase() === name.toLowerCase()
  );

  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1);
    if (item.cheapestStore !== undefined) {
      existingItem.cheapestStore = item.cheapestStore;
    }
    save();
    return existingItem;
  }

  const newItem = {
    id: Date.now().toString(),
    name,
    checked: false,
    quantity: item.quantity || 1,
    cheapestStore: item.cheapestStore ?? null,
  };

  grocery.push(newItem);
  save();
  return newItem;
}

export function toggleGroceryItem(id) {
  grocery = grocery.map(i =>
    i.id === id ? { ...i, checked: !i.checked } : i
  );
  save();
}

export function updateGroceryItem(id, updates) {
  grocery = grocery.map(item => {
    if (item.id !== id) {
      return item;
    }

    const nextName = updates.name?.trim();

    return {
      ...item,
      ...updates,
      ...(nextName ? { name: nextName } : {}),
    };
  });
  save();
}

export function deleteGroceryItem(id) {
  grocery = grocery.filter(i => i.id !== id);
  save();
}
