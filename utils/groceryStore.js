import AsyncStorage from '@react-native-async-storage/async-storage';

let grocery = [];
const KEY = 'grocery_list_v1';

(async function hydrate() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) grocery = JSON.parse(raw);
})();

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(grocery));
}

export function getGroceryList() {
  return grocery;
}

export function addToGroceryList(item) {
  grocery.push({
    id: Date.now().toString(),
    name: item.name,
    checked: false,
  });
  save();
}

export function toggleGroceryItem(id) {
  grocery = grocery.map(i =>
    i.id === id ? { ...i, checked: !i.checked } : i
  );
  save();
}

export function deleteGroceryItem(id) {
  grocery = grocery.filter(i => i.id !== id);
  save();
}
