import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addPantryItem } from '../../utils/pantryStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { deleteGroceryItem } from '../../utils/groceryStore';
import { formatExpirationDate, parseExpirationDate } from '../../utils/expiration';
import { scheduleItemExpirationAlert } from '../../utils/notifications';
import { PANTRY_CATEGORIES, guessCategoryForItem } from '../../utils/categoryMatch';
import { palette, shadows } from '../../utils/theme';

export default function AddPantryItem() {
  const router = useRouter();
  const {
    barcode,
    name: initialName,
    category: initialCategory,
    quantity: initialQuantity,
    fromGroceryId,
    expirationDate: initialExpDate,
    manualExpiry,
  } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Produce');
  const [quantity, setQuantity] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const shouldPromptManualExpiry =
    typeof manualExpiry === 'string' && manualExpiry === '1';

  useEffect(() => {
    if (barcode) {
      setName(`Scanned Item (${barcode})`);
    }
  }, [barcode]);

  useEffect(() => {
    if (typeof initialExpDate === 'string' && initialExpDate.trim()) {
      const parsed = parseExpirationDate(initialExpDate);
      setExpirationDate(parsed ? formatExpirationDate(parsed) : initialExpDate);
    }
  }, [initialExpDate]);

  useEffect(() => {
    if (typeof initialName === 'string' && initialName.trim()) {
      setName(initialName);
      const guessed = guessCategoryForItem(initialName);
      if (guessed) {
        setCategory(guessed);
      }
    }

    if (typeof initialCategory === 'string' && initialCategory.trim()) {
      setCategory(initialCategory);
    }

    if (typeof initialQuantity === 'string' && initialQuantity.trim()) {
      setQuantity(initialQuantity);
    }
  }, [initialCategory, initialName, initialQuantity]);

  const updateName = value => {
    setName(value);
    const guessed = guessCategoryForItem(value);
    if (guessed) {
      setCategory(guessed);
    }
  };

  const handleAdd = async () => {
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

    const pantryItem = {
      name: trimmedName,
      category,
      quantity: parsedQuantity,
      expirationDate: formatExpirationDate(parsedDate),
      ...(typeof barcode === 'string' && barcode.trim() ? { barcode: barcode.trim() } : {}),
    };

    const savedItem = addPantryItem(pantryItem);
    await scheduleItemExpirationAlert(savedItem);

    if (typeof fromGroceryId === 'string' && fromGroceryId) {
      deleteGroceryItem(fromGroceryId);
    }

    Alert.alert(
      'Item added',
      `${trimmedName} was added to your pantry.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Pantry Item</Text>

      <View style={styles.card}>
        <TextInput
          placeholder="Item name"
          value={name}
          onChangeText={updateName}
          style={styles.input}
          placeholderTextColor={palette.muted}
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={category}
            onValueChange={setCategory}
          >
            {PANTRY_CATEGORIES.map(option => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>

        <TextInput
          placeholder="Count/Lb"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor={palette.muted}
        />

        <TextInput
          placeholder="Expiration Date (MM/DD/YYYY)"
          value={expirationDate}
          onChangeText={setExpirationDate}
          style={styles.input}
          placeholderTextColor={palette.muted}
        />
        {shouldPromptManualExpiry && !expirationDate ? (
          <Text style={styles.manualExpiryHint}>
            Expiry scan did not find a date. Please type the expiry date manually.
          </Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={handleAdd} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.greenDeep,
    marginBottom: 16,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 14,
    ...shadows.card,
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
    color: palette.text,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#fff',
    color: palette.text,
  },
  manualExpiryHint: {
    marginTop: 8,
    color: palette.peachDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: palette.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
