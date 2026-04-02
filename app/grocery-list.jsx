import React, { useCallback, useState } from 'react';
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
import { palette, shadows } from '../utils/theme';

export default function GroceryList() {
  const [input, setInput] = useState('');
  const [groceryList, setGroceryList] = useState(getGroceryList());
  const [editingId, setEditingId] = useState(null);

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

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.checked && styles.checkedCard]}>
      <View style={styles.cardTopRow}>
        <View style={styles.itemTextArea}>
          <Text style={[styles.itemName, item.checked && styles.checkedText]}>
            {item.name}
          </Text>
          <Text style={styles.itemSubText}>
            {item.cheapestStore
              ? `${item.cheapestStore.name} - $${item.cheapestStore.price}`
              : 'Store info will appear later'}
          </Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.heroCard}>
        <Text style={styles.title}>Grocery List</Text>
        <Text style={styles.subtitle}>Keep shopping simple with one smart list.</Text>
      </View>

      <View style={styles.inputPanel}>
        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="Type item (milk, rice, eggs...)"
            value={input}
            onChangeText={setInput}
          />

          <Pressable style={styles.addButton} onPress={addOrUpdateItem}>
            <Text style={styles.addButtonText}>{editingId ? 'Save' : 'Add'}</Text>
          </Pressable>
        </View>

        {editingId ? (
          <Pressable style={styles.cancelEditButton} onPress={cancelEdit}>
            <Text style={styles.cancelEditText}>Cancel editing</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listPanel}>
        <FlatList
          data={groceryList}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first grocery item above
              </Text>
            </View>
          }
        />
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
