import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { getPantryItems, updatePantryItem } from '../utils/pantryStore';
import { formatExpirationDate, parseExpirationDate } from '../utils/expiration';
import { scheduleItemExpirationAlert } from '../utils/notifications';
import { PANTRY_CATEGORIES, guessCategoryForItem } from '../utils/categoryMatch';
import { palette, shadows } from '../utils/theme';

export default function EditItem() {
  const { id } = useLocalSearchParams();
  const item = getPantryItems().find(entry => entry.id === id);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [quantity, setQuantity] = useState(String(item?.quantity || ''));
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate || '');

  useEffect(() => {
    const guessed = guessCategoryForItem(name);
    if (guessed) {
      setCategory(guessed);
    }
  }, [name]);

  const updateName = value => {
    setName(value);
    const guessed = guessCategoryForItem(value);
    if (guessed) {
      setCategory(guessed);
    }
  };

  const save = async () => {
    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);
    const parsedDate = parseExpirationDate(expirationDate);

    if (!trimmedName) {
      Alert.alert('Missing item name', 'Please enter a pantry item name.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid count/lb', 'Count/Lb must be a number greater than 0.');
      return;
    }

    if (!parsedDate) {
      Alert.alert(
        'Invalid expiration date',
        'Use MM/DD/YYYY for the expiration date.'
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
        onChangeText={updateName}
        placeholder="Name"
      />

      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={category || 'Other'}
          onValueChange={setCategory}
        >
          {PANTRY_CATEGORIES.map(option => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Count/Lb"
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        value={expirationDate}
        onChangeText={setExpirationDate}
        placeholder="MM/DD/YYYY"
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
  fieldLabel: {
    marginBottom: 4,
    fontWeight: '600',
    color: palette.text,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
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
