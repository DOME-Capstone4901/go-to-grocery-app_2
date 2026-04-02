import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { addToGroceryList, getGroceryList } from '../utils/groceryStore';
import { palette, shadows } from '../utils/theme';

const GROCERY_ITEMS = [
  { id: '1', name: 'Milk', category: 'Dairy' },
  { id: '2', name: 'Eggs', category: 'Dairy' },
  { id: '3', name: 'Bread', category: 'Bakery' },
  { id: '4', name: 'Rice', category: 'Grains' },
  { id: '5', name: 'Chicken Breast', category: 'Meat' },
  { id: '6', name: 'Apples', category: 'Produce' },
  { id: '7', name: 'Bananas', category: 'Produce' },
  { id: '8', name: 'Tomatoes', category: 'Produce' },
  { id: '9', name: 'Onions', category: 'Produce' },
  { id: '10', name: 'Pasta', category: 'Pantry' },
  { id: '11', name: 'Olive Oil', category: 'Pantry' },
  { id: '12', name: 'Yogurt', category: 'Dairy' },
  { id: '13', name: 'Cheddar Cheese', category: 'Dairy' },
  { id: '14', name: 'Spinach', category: 'Produce' },
  { id: '15', name: 'Salmon', category: 'Meat' },
];

function uniq(arr) {
  return Array.from(new Set(arr));
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recent, setRecent] = useState([]);
  const [sortAZ, setSortAZ] = useState(true);
  const [addedIds, setAddedIds] = useState([]);

  const categories = useMemo(
    () => ['All', ...uniq(GROCERY_ITEMS.map(item => item.category)).sort()],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = GROCERY_ITEMS;

    if (selectedCategory !== 'All') {
      list = list.filter(item => item.category === selectedCategory);
    }

    if (q) {
      list = list.filter(item => {
        const hay = `${item.name} ${item.category}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAZ ? cmp : -cmp;
    });
  }, [query, selectedCategory, sortAZ]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const starts = GROCERY_ITEMS.filter(item =>
      item.name.toLowerCase().startsWith(q)
    );
    const contains = GROCERY_ITEMS.filter(
      item =>
        !item.name.toLowerCase().startsWith(q) &&
        item.name.toLowerCase().includes(q)
    );

    return [...starts, ...contains].slice(0, 5);
  }, [query]);

  const groceryCount = getGroceryList().length;

  const pushRecent = text => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecent(prev => [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 6));
  };

  const addItemToList = item => {
    const alreadyExists = getGroceryList().some(
      entry => entry.name.toLowerCase() === item.name.toLowerCase()
    );

    addToGroceryList({ name: item.name, quantity: 1 });
    setAddedIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
    pushRecent(item.name);

    Alert.alert(
      alreadyExists ? 'Updated grocery list' : 'Added to grocery list',
      alreadyExists
        ? `${item.name} quantity was increased in your list.`
        : `${item.name} was added to your grocery list.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Grocery Search</Text>
          <Text style={styles.subtitle}>Find items fast and add them to your list</Text>
        </View>

        <Pressable
          style={styles.cartPill}
          onPress={() => router.push('/groceryList')}
        >
          <Text style={styles.cartText}>List: {groceryCount}</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search items (milk, apple, pasta...)"
        placeholderTextColor="#888"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => pushRecent(query)}
        returnKeyType="search"
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map(item => (
            <Pressable
              key={item.id}
              style={styles.suggestRow}
              onPress={() => {
                setQuery(item.name);
                pushRecent(item.name);
              }}
            >
              <Text style={styles.suggestText}>{item.name}</Text>
              <Text style={styles.suggestMuted}>{item.category}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {recent.map(item => (
              <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.chip, styles.chipDark]}
              onPress={() => setRecent([])}
            >
              <Text style={[styles.chipText, styles.chipTextDark]}>Clear</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map(category => {
            const active = category === selectedCategory;
            return (
              <Pressable
                key={category}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.controlsRow}>
        <Text style={styles.metaText}>
          Showing {filtered.length} / {GROCERY_ITEMS.length}
        </Text>

        <View style={styles.buttonRow}>
          <Pressable style={styles.smallBtn} onPress={() => setSortAZ(value => !value)}>
            <Text style={styles.smallBtnText}>{sortAZ ? 'A-Z' : 'Z-A'}</Text>
          </Pressable>

          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              setQuery('');
              setSelectedCategory('All');
            }}
          >
            <Text style={styles.smallBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const added = addedIds.includes(item.id);

          return (
            <View style={styles.row}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>

              <Pressable
                style={[styles.addBtn, added && styles.addBtnActive]}
                onPress={() => addItemToList(item)}
              >
                <Text style={[styles.addBtnText, added && styles.addBtnTextActive]}>
                  {added ? 'Added' : 'Add'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches. Try another search.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.bg,
    position: 'relative',
    overflow: 'hidden',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -28,
    right: -34,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#F8D0B5',
    opacity: 0.24,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 142,
    left: -42,
    width: 126,
    height: 126,
    borderRadius: 999,
    backgroundColor: '#DCE7D4',
    opacity: 0.2,
  },
  headerRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: { fontSize: 30, fontWeight: '800', color: palette.greenDeep, letterSpacing: 0.2 },
  subtitle: { marginTop: 4, color: palette.muted, maxWidth: 230, lineHeight: 20 },
  cartPill: {
    backgroundColor: palette.orange,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  cartText: { color: '#fff', fontWeight: '700' },
  input: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  suggestBox: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestText: { fontWeight: '700', color: palette.text },
  suggestMuted: { color: palette.muted },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: palette.greenDeep },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipText: { fontWeight: '600', color: palette.text },
  chipActive: { backgroundColor: palette.greenDeep, borderColor: palette.greenDeep },
  chipTextActive: { color: '#fff' },
  chipDark: { backgroundColor: palette.orange, borderColor: palette.orange },
  chipTextDark: { color: '#fff' },
  controlsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: { color: palette.muted },
  buttonRow: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  list: { paddingTop: 12, paddingBottom: 24 },
  row: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  itemName: { fontSize: 16, fontWeight: '700', color: palette.text },
  itemCategory: { marginTop: 2, color: palette.muted },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EFE4D8',
  },
  addBtnActive: { backgroundColor: palette.orange },
  addBtnText: { fontWeight: '700', color: palette.text },
  addBtnTextActive: { color: '#fff' },
  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { color: palette.muted },
});
