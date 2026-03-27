import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { getDaysUntilExpiration } from '../../utils/expiration';
import { isLowStock } from '../../utils/lowStock';
import { deletePantryItem } from '../../utils/pantryStore';

export default function PantryFilter({ groupedItems }) {

  // Normalize sections so data is ALWAYS an array
  const sections = [
    { title: 'Expired', data: groupedItems?.expired || [] },
    { title: 'Expiring Soon', data: groupedItems?.soon || [] },
    { title: 'This Week', data: groupedItems?.week || [] },
    { title: 'This Month', data: groupedItems?.month || [] },
    { title: 'Later', data: groupedItems?.later || [] },
  ];

  const renderRightActions = (id) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => {
        deletePantryItem(id);
        router.replace('/MainPantryTab'); // refresh
      }}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const days = getDaysUntilExpiration(item.expirationDate);
    const expired = days < 0;
    const expiringSoon = days >= 0 && days <= 3;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/details?id=${item.id}`)}
        >
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>

            {isLowStock(item) && (
              <Text style={styles.lowStock}>Low Stock!</Text>
            )}
          </View>

          <Text style={styles.category}>{item.category}</Text>

          {expired ? (
            <Text style={styles.expired}>Expired {Math.abs(days)} days ago</Text>
          ) : expiringSoon ? (
            <Text style={styles.soon}>Expires in {days} days</Text>
          ) : (
            <Text style={styles.date}>Expires: {item.expirationDate}</Text>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(section) => section.title}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: section }) => (
          <View>
            {/* Section Header */}
            {section.data.length > 0 && (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}

            {/* Items */}
            {section.data.map((item) => (
              <View key={item.id}>{renderItem({ item })}</View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  sectionHeader: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },

  card: {
    backgroundColor: '#f5f5f5',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  category: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },

  lowStock: {
    color: '#d32f2f',
    fontWeight: '700',
    fontSize: 14,
  },

  expired: {
    marginTop: 6,
    color: '#d32f2f',
    fontWeight: '700',
  },

  soon: {
    marginTop: 6,
    color: '#f57c00',
    fontWeight: '700',
  },

  date: {
    marginTop: 6,
    color: '#666',
  },

  deleteButton: {
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  deleteText: {
    color: '#fff',
    fontWeight: '700',
  },
});

