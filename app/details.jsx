import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getPantryItems, deletePantryItem } from '../utils/pantryStore';
import { getDaysUntilExpiration } from '../utils/expiration';

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
    backgroundColor: '#f5f5f5' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 20 
  },
  subtitle: { 
    marginTop: 8, 
    color: '#666', 
    fontSize: 18 
  },
  expired: { color: '#d32f2f', fontWeight: '700' },
  soon: { color: '#f57c00', fontWeight: '700' },

  deleteButton: {
    marginTop: 30,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  button: { 
    marginTop: 15, 
    backgroundColor: '#111', 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 10 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
});
