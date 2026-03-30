import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, TextInput, Pressable } from 'react-native';
import { getPantryItems, updatePantryItem } from '../utils/pantryStore';

export default function EditItem() {
  const { id } = useLocalSearchParams();
  const item = getPantryItems().find(i => i.id === id);

  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [expirationDate, setExpirationDate] = useState(item.expirationDate);

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
    <View style={{ padding: 20 }}>
      <Text>Edit Item</Text>

      <TextInput value={name} onChangeText={setName} />
      <TextInput value={category} onChangeText={setCategory} />
      <TextInput value={quantity} onChangeText={setQuantity} />
      <TextInput value={expirationDate} onChangeText={setExpirationDate} />

      <Pressable onPress={save}>
        <Text>Save Changes</Text>
      </Pressable>
    </View>
  );
}
