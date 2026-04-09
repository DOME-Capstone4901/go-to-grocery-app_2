import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getPantryItems, deletePantryItem } from '../utils/pantryStore';
import { getDaysUntilExpiration } from '../utils/expiration';
import { addToGroceryList } from '../utils/groceryStore';
import { palette, shadows } from '../utils/theme';

export default function Details() {
  const { id } = useLocalSearchParams();

  const pantryItems = getPantryItems();
  const item = pantryItems.find(i => i.id === id);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Item not found</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const daysUntil = getDaysUntilExpiration(item.expirationDate);
  const isExpired = daysUntil < 0;
  const isExpiringSoon = daysUntil >= 0 && daysUntil <= 3;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{item.name}</Text>

      <Text style={styles.subtitle}>Category: {item.category}</Text>
      <Text style={styles.subtitle}>Quantity: {item.quantity}</Text>

      <Text
        style={[
          styles.subtitle,
          isExpired && styles.expired,
          isExpiringSoon && styles.soon
        ]}
      >
        {isExpired
          ? `Expired ${Math.abs(daysUntil)} days ago`
          : `Expires in ${daysUntil} days`}
      </Text>

      <Text style={styles.subtitle}>Date: {item.expirationDate}</Text>

      <Pressable
        style={styles.restockButton}
        onPress={() => {
          addToGroceryList({
            name: item.name,
            quantity: 1,
          });
          router.push('/groceryList');
        }}
      >
        <Text style={styles.restockButtonText}>Add Back To Grocery List</Text>
      </Pressable>

      {/* DELETE BUTTON */}
      <Pressable
        style={styles.deleteButton}
        onPress={() => {
          deletePantryItem(item.id);
          router.replace('/MainPantryTab');
        }}
      >
        <Text style={styles.deleteButtonText}>Delete Item</Text>
      </Pressable>

      {/* BACK BUTTON */}
      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: palette.bg,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 20,
    color: palette.greenDeep,
  },
  subtitle: { 
    marginTop: 8, 
    color: palette.muted,
    fontSize: 18 
  },
  expired: { color: palette.peachDeep, fontWeight: '700' },
  soon: { color: palette.orange, fontWeight: '700' },

  deleteButton: {
    marginTop: 15,
    backgroundColor: palette.peachDeep,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    ...shadows.card,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  restockButton: {
    marginTop: 30,
    backgroundColor: palette.orange,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    ...shadows.card,
  },
  restockButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  button: { 
    marginTop: 15, 
    backgroundColor: palette.greenDeep,
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 10,
    ...shadows.card,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
});
