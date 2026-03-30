import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  getGroceryList,
  toggleGroceryItem,
  deleteGroceryItem
} from '../../utils/groceryStore';


export default function GroceryList() {
  const [items, setItems] = useState(getGroceryList());

  const refresh = () => setItems([...getGroceryList()]);

  const renderRightActions = (item) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => {
        deleteGroceryItem(item.id);
        refresh();
      }}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={[styles.item, item.checked && styles.checkedItem]}
        onPress={() => {
          toggleGroceryItem(item.id);
          refresh();
        }}
      >
        <Text style={[styles.itemText, item.checked && styles.checkedText]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grocery List</Text>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={styles.empty}>No items yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  itemText: { fontSize: 18 },
  checkedItem: { backgroundColor: '#e0ffe0' },
  checkedText: { textDecorationLine: 'line-through', color: '#888' },
  deleteButton: { backgroundColor: '#d32f2f', justifyContent: 'center', padding: 20 },
  deleteText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
