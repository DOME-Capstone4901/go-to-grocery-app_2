import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getPantryItems, updatePantryItem } from '../utils/pantryStore';
import { formatExpirationDate, parseExpirationDate } from '../utils/expiration';
import { scheduleItemExpirationAlert } from '../utils/notifications';
import { palette, shadows } from '../utils/theme';

export default function EditItem() {
  const { id } = useLocalSearchParams();
  const item = getPantryItems().find(entry => entry.id === id);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [quantity, setQuantity] = useState(String(item?.quantity || ''));
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate || '');

  const save = async () => {
    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);
    const parsedDate = parseExpirationDate(expirationDate);

    if (!trimmedName) {
      Alert.alert('Missing item name', 'Please enter a pantry item name.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be a number greater than 0.');
      return;
    }

    if (!parsedDate) {
      Alert.alert(
        'Invalid expiration date',
        'Use YYYY-MM-DD or MM-DD-YYYY for the expiration date.'
      );
      return;
    }

    const updatedItem = {
      id,
      name: trimmedName,
      category,
      quantity: parsedQuantity,
      expirationDate: formatExpirationDate(parsedDate),
    };

    updatePantryItem(id, updatedItem);
    await scheduleItemExpirationAlert(updatedItem);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Item</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Name"
      />
      <TextInput
        style={styles.input}
        value={category}
        onChangeText={setCategory}
        placeholder="Category"
      />
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Quantity"
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        value={expirationDate}
        onChangeText={setExpirationDate}
        placeholder="YYYY-MM-DD"
      />

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: palette.bg },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: palette.greenDeep },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: palette.text,
  },
  button: {
    backgroundColor: palette.orange,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    ...shadows.card,
  },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
