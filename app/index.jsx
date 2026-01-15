import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'

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
]

function uniq(arr) {
  return Array.from(new Set(arr))
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState([]) // array of item ids
  const [recent, setRecent] = useState([]) // array of strings
  const [sortAZ, setSortAZ] = useState(true)

  const categories = useMemo(() => {
    return ['All', ...uniq(GROCERY_ITEMS.map((i) => i.category)).sort()]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list = GROCERY_ITEMS

    if (selectedCategory !== 'All') {
      list = list.filter((i) => i.category === selectedCategory)
    }

    if (q) {
      list = list.filter((i) => {
        const hay = `${i.name} ${i.category}`.toLowerCase()
        return hay.includes(q)
      })
    }

    list = [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name)
      return sortAZ ? cmp : -cmp
    })

    return list
  }, [query, selectedCategory, sortAZ])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // top 5 autocomplete suggestions based on startsWith first, then includes
    const starts = GROCERY_ITEMS.filter((i) => i.name.toLowerCase().startsWith(q))
    const contains = GROCERY_ITEMS.filter(
      (i) => !i.name.toLowerCase().startsWith(q) && i.name.toLowerCase().includes(q)
    )
    return [...starts, ...contains].slice(0, 5)
  }, [query])

  const cartCount = cart.length

  const toggleCart = (itemId) => {
    setCart((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const pushRecent = (text) => {
    const t = text.trim()
    if (!t) return
    setRecent((prev) => [t, ...prev.filter((x) => x !== t)].slice(0, 6))
  }

  const onSubmitSearch = () => pushRecent(query)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Grocery Search</Text>
          <Text style={styles.subtitle}>Find items fast • add to list</Text>
        </View>

        <Pressable style={styles.cartPill} onPress={() => router.push({ pathname: '/details', params: { cartCount } })}>
          <Text style={styles.cartText}>List: {cartCount}</Text>
        </Pressable>
      </View>

      {/* Search input */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search items (milk, apple, pasta...)"
        placeholderTextColor="#888"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitSearch}
        returnKeyType="search"
      />

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={styles.suggestRow}
              onPress={() => {
                setQuery(s.name)
                pushRecent(s.name)
              }}
            >
              <Text style={styles.suggestText}>{s.name}</Text>
              <Text style={styles.suggestMuted}>{s.category}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Recent searches */}
      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {recent.map((r) => (
              <Pressable key={r} style={styles.chip} onPress={() => setQuery(r)}>
                <Text style={styles.chipText}>{r}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.chip, styles.chipDark]} onPress={() => setRecent([])}>
              <Text style={[styles.chipText, styles.chipTextDark]}>Clear</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Category filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((c) => {
            const active = c === selectedCategory
            return (
              <Pressable
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <Text style={styles.metaText}>
          Showing {filtered.length} / {GROCERY_ITEMS.length}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.smallBtn} onPress={() => setSortAZ((v) => !v)}>
            <Text style={styles.smallBtnText}>{sortAZ ? 'A–Z' : 'Z–A'}</Text>
          </Pressable>

          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              setQuery('')
              setSelectedCategory('All')
            }}
          >
            <Text style={styles.smallBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const inCart = cart.includes(item.id)
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/details',
                  params: { name: item.name, category: item.category, inCart: inCart ? 'yes' : 'no' },
                })
              }
            >
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>

              <Pressable
                style={[styles.addBtn, inCart && styles.addBtnActive]}
                onPress={() => toggleCart(item.id)}
              >
                <Text style={[styles.addBtnText, inCart && styles.addBtnTextActive]}>
                  {inCart ? 'Added' : 'Add'}
                </Text>
              </Pressable>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches. Try another search.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },

  headerRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#666' },
  cartPill: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cartText: { color: '#fff', fontWeight: '700' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  suggestBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestText: { fontWeight: '700' },
  suggestMuted: { color: '#666' },

  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },

  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { fontWeight: '600' },
  chipActive: { backgroundColor: '#111' },
  chipTextActive: { color: '#fff' },
  chipDark: { backgroundColor: '#111' },
  chipTextDark: { color: '#fff' },

  controlsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: { color: '#666' },
  smallBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },

  list: { paddingTop: 12, paddingBottom: 24 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: { fontSize: 16, fontWeight: '700' },
  itemCategory: { marginTop: 2, color: '#666' },

  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  addBtnActive: { backgroundColor: '#111' },
  addBtnText: { fontWeight: '700' },
  addBtnTextActive: { color: '#fff' },

  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { color: '#666' },
})
