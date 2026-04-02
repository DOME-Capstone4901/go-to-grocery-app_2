import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { getDaysUntilExpiration } from '../../utils/expiration';
import { isLowStock } from '../../utils/lowStock';
import { deletePantryItem } from '../../utils/pantryStore';
import { palette, shadows } from '../../utils/theme';

export default function PantryFilter({ groupedItems }) {

  // Normalize sections so data is ALWAYS an array
  const sections = [
    { title: 'Expired', data: groupedItems?.expired || [] },
    { title: 'Expiring Soon', data: groupedItems?.soon || [] },
    { title: 'This Week', data: groupedItems?.week || [] },
    { title: 'This Month', data: groupedItems?.month || [] },
    { title: 'Later', data: groupedItems?.later || [] },
  ];
  const hasItems = sections.some(section => section.data.length > 0);

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
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Pantry Overview</Text>
        <Text style={styles.heroSubtitle}>Track freshness and restock at the right time.</Text>
      </View>

      <View style={styles.listPanel}>
        {hasItems ? (
          <FlatList
            data={sections}
            keyExtractor={(section) => section.title}
            contentContainerStyle={{ paddingBottom: 28 }}
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
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Pantry is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add an item from the Add Item tab or move one from Grocery List.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: palette.bg,
    position: 'relative',
    overflow: 'hidden',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -26,
    right: -26,
    width: 138,
    height: 138,
    borderRadius: 999,
    backgroundColor: '#F8D1B9',
    opacity: 0.24,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 110,
    left: -42,
    width: 118,
    height: 118,
    borderRadius: 999,
    backgroundColor: '#DDE6D5',
    opacity: 0.2,
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
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.greenDeep,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: palette.muted,
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
  sectionHeader: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
    color: palette.greenDeep,
  },
  card: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  category: {
    marginTop: 4,
    fontSize: 14,
    color: palette.muted,
  },
  lowStock: {
    color: palette.orange,
    fontWeight: '700',
    fontSize: 14,
  },
  expired: {
    marginTop: 6,
    color: palette.peachDeep,
    fontWeight: '700',
  },
  soon: {
    marginTop: 6,
    color: palette.orange,
    fontWeight: '700',
  },
  date: {
    marginTop: 6,
    color: palette.muted,
  },
  deleteButton: {
    backgroundColor: palette.peachDeep,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.greenDeep,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
});

