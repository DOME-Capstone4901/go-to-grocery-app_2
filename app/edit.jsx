import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getPantryItems, updatePantryItem } from '../utils/pantryStore';

export default function EditItem() {
  const { id } = useLocalSearchParams();
  const item = getPantryItems().find(i => i.id === id);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [quantity, setQuantity] = useState(String(item?.quantity || ''));
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate || '');

  const save = () => {
    updatePantryItem(id, {
      name,
      category,
      quantity: Number(quantity),
      expirationDate,
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Item</Text>

      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Category" />
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Quantity" keyboardType="numeric" />
      <TextInput style={styles.input} value={expirationDate} onChangeText={setExpirationDate} placeholder="YYYY-MM-DD" />

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
