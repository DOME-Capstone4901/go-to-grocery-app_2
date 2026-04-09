import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  addToGroceryList,
  deleteGroceryItem,
  getGroceryList,
  loadGroceryList,
  toggleGroceryItem,
  updateGroceryItem,
} from '../utils/groceryStore';
import {
  findGroceryCatalogMatch,
  formatMoney,
} from '../data/storeInventory';
import { US_GROCERY_PRODUCTS } from '../data/usGroceryCatalog';
import { palette, shadows } from '../utils/theme';

export default function GroceryList() {
  const [input, setInput] = useState('');
  const [groceryList, setGroceryList] = useState(getGroceryList());
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'catalog'

  const catalogFiltered = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return US_GROCERY_PRODUCTS;
    return US_GROCERY_PRODUCTS.filter(p => {
      const hay = `${p.name} ${p.category}`.toLowerCase();
      if (hay.includes(q)) return true;
      return p.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q));
    });
  }, [input]);

  const refreshList = useCallback(() => {
    setGroceryList([...getGroceryList()]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadGroceryList().then(() => {
        if (active) {
          refreshList();
        }
      });

      return () => {
        active = false;
      };
    }, [refreshList])
  );

  const addOrUpdateItem = () => {
    const trimmed = input.trim();

    if (!trimmed) {
      Alert.alert('Please enter an item');
      return;
    }

    if (editingId) {
      const duplicateWhileEditing = groceryList.some(
        item =>
          item.id !== editingId &&
          item.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (duplicateWhileEditing) {
        Alert.alert('Item already added');
        return;
      }

      updateGroceryItem(editingId, { name: trimmed });
      refreshList();
      setEditingId(null);
      setInput('');
      return;
    }

    const alreadyExists = groceryList.some(
      item => item.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      Alert.alert('Item already added');
      return;
    }

    addToGroceryList({
      name: trimmed,
      quantity: 1,
      cheapestStore: null,
    });
    refreshList();
    setInput('');
  };

  const addFromCatalog = product => {
    addToGroceryList({ name: product.name, quantity: 1, cheapestStore: null });
    refreshList();
  };

  const removeItem = id => {
    deleteGroceryItem(id);
    refreshList();

    if (editingId === id) {
      setEditingId(null);
      setInput('');
    }
  };

  const startEditItem = item => {
    setEditingId(item.id);
    setInput(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setInput('');
  };

  const changeQuantity = (id, delta) => {
    const item = groceryList.find(entry => entry.id === id);
    if (!item) return;

    updateGroceryItem(id, {
      quantity: Math.max(1, (item.quantity || 1) + delta),
    });
    refreshList();
  };

  const moveToPantry = item => {
    router.push({
      pathname: '/addToPantry',
      params: {
        name: item.name,
        quantity: String(item.quantity || 1),
        fromGroceryId: item.id,
      },
    });
  };

  const renderItem = ({ item }) => {
    const match = findGroceryCatalogMatch(item.name);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const pw = match ? Number(match.prices.walmart) : null;
    const pk = match ? Number(match.prices.kroger) : null;
    const pa = match ? Number(match.prices.aldi) : null;
    let cheapestLabel = '';
    if (match && pw != null && pk != null && pa != null) {
      const min = Math.min(pw, pk, pa);
      const chain =
        min === pa ? 'Aldi' : min === pk ? 'Kroger' : 'Walmart';
      cheapestLabel = ` · Lowest: ${chain} ${formatMoney(min)}`;
    }

    return (
    <View style={[styles.card, item.checked && styles.checkedCard]}>
      <View style={styles.cardTopRow}>
        <View style={styles.itemTextArea}>
          <Text style={[styles.itemName, item.checked && styles.checkedText]}>
            {item.name}
          </Text>
          {match ? (
            <>
              <Text style={styles.catalogMatchNote} numberOfLines={2}>
                Matched: {match.name}
              </Text>
              <Text style={styles.priceLine}>
                {match.unit === 'lb' ? 'Est. per lb · ' : 'Est. each · '}
                WM {formatMoney(pw)} · KR {formatMoney(pk)} · ALDI {formatMoney(pa)}
                {cheapestLabel}
              </Text>
              <Text style={styles.priceLineQty}>
                ×{qty} on list · ~{formatMoney(pw * qty)} · ~{formatMoney(pk * qty)} · ~{formatMoney(pa * qty)} total
              </Text>
            </>
          ) : (
            <Text style={styles.itemSubText}>
              No catalog match — try names like Whole milk 1 gal or Bananas for demo prices.
            </Text>
          )}
        </View>

        <Pressable
          style={styles.deleteButton}
          onPress={() => removeItem(item.id)}
        >
          <Text style={styles.deleteButtonText}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.cardBottomRow}>
        <View style={styles.quantityBox}>
          <Pressable
            style={styles.qtyButton}
            onPress={() => changeQuantity(item.id, -1)}
          >
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>

          <Text style={styles.quantityText}>{item.quantity || 1}</Text>

          <Pressable
            style={styles.qtyButton}
            onPress={() => changeQuantity(item.id, 1)}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => startEditItem(item)}
          >
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </Pressable>

          <Pressable
            style={[
              styles.secondaryButton,
              item.checked && styles.doneButton,
            ]}
            onPress={() => {
              toggleGroceryItem(item.id);
              refreshList();
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {item.checked ? 'Bought' : 'Mark Bought'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => moveToPantry(item)}>
        <Text style={styles.primaryButtonText}>Move To Pantry</Text>
      </Pressable>
    </View>
  );
  };

  return (
    <View style={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.heroCard}>
        <Text style={styles.title}>Grocery List</Text>
        <Text style={styles.subtitle}>
          Demo prices (Walmart · Kroger · Aldi) show when the name matches the in-app catalog.
        </Text>
      </View>

      <View style={styles.inputPanel}>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeChip, viewMode === 'list' && styles.modeChipOn]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.modeChipText, viewMode === 'list' && styles.modeChipTextOn]}>
              My list
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, viewMode === 'catalog' && styles.modeChipOn]}
            onPress={() => setViewMode('catalog')}
          >
            <Text style={[styles.modeChipText, viewMode === 'catalog' && styles.modeChipTextOn]}>
              Browse all groceries
            </Text>
          </Pressable>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder={viewMode === 'catalog' ? 'Search catalog (milk, rice, bananas...)' : 'Type item (milk, rice, eggs...)'}
            value={input}
            onChangeText={setInput}
          />

          {viewMode === 'list' ? (
            <Pressable style={styles.addButton} onPress={addOrUpdateItem}>
              <Text style={styles.addButtonText}>{editingId ? 'Save' : 'Add'}</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.addButton, styles.addButtonAlt]} onPress={() => setInput('')}>
              <Text style={styles.addButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {editingId ? (
          <Pressable style={styles.cancelEditButton} onPress={cancelEdit}>
            <Text style={styles.cancelEditText}>Cancel editing</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listPanel}>
        {viewMode === 'list' ? (
          <FlatList
            data={groceryList}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first grocery item above, or switch to Browse all groceries.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={catalogFiltered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.catalogRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.catalogName}>{item.name}</Text>
                  <Text style={styles.catalogMeta}>{item.category} · {item.unit === 'lb' ? 'per lb' : 'each'}</Text>
                  <Text style={styles.catalogPrice}>
                    WM {formatMoney(item.prices.walmart)} · KR {formatMoney(item.prices.kroger)} · ALDI {formatMoney(item.prices.aldi)}
                  </Text>
                </View>
                <Pressable style={styles.catalogAddBtn} onPress={() => addFromCatalog(item)}>
                  <Text style={styles.catalogAddBtnText}>+ Add</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySubtitle}>
                  Try a different search (e.g. milk, rice, bananas).
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    padding: 20,
    paddingTop: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -34,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#FAD7C1',
    opacity: 0.28,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 120,
    left: -45,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: '#E0E9DA',
    opacity: 0.24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.greenDeep,
    letterSpacing: 0.2,
  },
  heroCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F7EFE6',
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 14,
    ...shadows.card,
  },
  subtitle: {
    fontSize: 15,
    color: palette.muted,
    marginTop: 4,
    marginBottom: 0,
  },
  inputPanel: {
    width: '100%',
    backgroundColor: '#F6EEE5',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modeChipOn: {
    backgroundColor: palette.greenDeep,
    borderColor: palette.greenDeep,
  },
  modeChipText: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 13,
  },
  modeChipTextOn: {
    color: '#fff',
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: palette.orange,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
  },
  addButtonAlt: {
    backgroundColor: palette.greenDeep,
    borderTopColor: '#5a8a4a',
    borderBottomColor: '#2d4a24',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  cancelEditButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  cancelEditText: {
    color: palette.orange,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 30,
  },
  listPanel: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#F6EEE5',
    borderWidth: 1,
    borderColor: palette.border,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  catalogName: { fontSize: 16, fontWeight: '800', color: palette.text },
  catalogMeta: { marginTop: 4, fontSize: 12, color: palette.muted },
  catalogPrice: { marginTop: 6, fontSize: 13, fontWeight: '700', color: palette.greenDeep },
  catalogAddBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
  },
  catalogAddBtnText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  checkedCard: {
    borderColor: palette.green,
    backgroundColor: '#EEF5F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTextArea: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: palette.muted,
  },
  itemSubText: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  catalogMatchNote: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  priceLine: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.greenDeep,
    marginTop: 6,
    lineHeight: 18,
  },
  priceLineQty: {
    fontSize: 12,
    color: palette.text,
    marginTop: 4,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: palette.peachDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECAF9A',
    borderBottomWidth: 2,
    borderBottomColor: '#A75740',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  quantityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1ECE5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E5DBD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  quantityText: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    marginHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: palette.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
  },
  doneButton: {
    backgroundColor: palette.green,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: palette.orange,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.muted,
  },
  emptySubtitle: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 6,
  },
});
