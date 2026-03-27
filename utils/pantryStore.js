import AsyncStorage from '@react-native-async-storage/async-storage';

let pantryItems = [];

// Save pantry to AsyncStorage
async function save() {
  try {
    await AsyncStorage.setItem('PANTRY', JSON.stringify(pantryItems));
  } catch (e) {
    console.log('Error saving pantry:', e);
  }
}

// Load pantry from AsyncStorage
export async function loadPantry() {
  try {
    const data = await AsyncStorage.getItem('PANTRY');
    pantryItems = data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('Error loading pantry:', e);
  }
}

export function addPantryItem(item) {
  const newItem = {
    id: Date.now().toString(),
    ...item,
  };

  pantryItems.push(newItem);
  save();
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
