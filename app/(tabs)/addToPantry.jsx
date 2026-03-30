import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { addPantryItem } from '../../utils/pantryStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

export default function AddPantryItem() {
  const router = useRouter();
  const { barcode } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Produce');
  const [quantity, setQuantity] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // Auto-fill name when barcode is scanned
  useEffect(() => {
    if (barcode) {
      setName(`Scanned Item (${barcode})`);
    }
  }, [barcode]);

  const handleAdd = () => {
    if (!name.trim()) return;

    addPantryItem({
      name,
      category,
      quantity: Number(quantity),
      expirationDate,
    });

    router.back();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Add Pantry Item</Text>

      <TextInput
        placeholder="Item name"
        value={name}
        onChangeText={setName}
        style={{ marginTop: 20, padding: 12, borderWidth: 1 }}
      />

      {/* CATEGORY PICKER */}
      <Text style={{ marginTop: 15, fontWeight: '600' }}>Category</Text>
      <Picker
        selectedValue={category}
        onValueChange={(value) => setCategory(value)}
        style={{ borderWidth: 1, marginTop: 5 }}
      >
        <Picker.Item label="Produce" value="Produce" />
        <Picker.Item label="Dairy" value="Dairy" />
        <Picker.Item label="Meat" value="Meat" />
        <Picker.Item label="Snacks" value="Snacks" />
        <Picker.Item label="Beverages" value="Beverages" />
        <Picker.Item label="Grains" value="Grains" />
        <Picker.Item label="Bread" value="Bread" />
        <Picker.Item label="Canned Goods" value="Canned Goods" />
      </Picker>

      <TextInput
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={{ marginTop: 10, padding: 12, borderWidth: 1 }}
      />

      <TextInput
        placeholder="Expiration Date (MM-DD-YYYY)"
        value={expirationDate}
        onChangeText={setExpirationDate}
        style={{ marginTop: 10, padding: 12, borderWidth: 1 }}
      />

      <TouchableOpacity
        onPress={handleAdd}
        style={{
          marginTop: 20,
          padding: 15,
          backgroundColor: '#007AFF',
          borderRadius: 6,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>Save Item</Text>
      </TouchableOpacity>
    </View>
  );
}
