import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GlobalSearchBar from '../components/GlobalSearchBar';
import { loadPantry } from '../utils/pantryStore';
import { loadGroceryList } from '../utils/groceryStore';
import { loadStoreCart } from '../utils/storeCartStore';
import { loadStoreOrders } from '../utils/storeOrderStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadPantry(),
      loadGroceryList(),
      loadStoreCart(),
      loadStoreOrders(),
    ]).finally(() => {
      if (active) {
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        {ready ? (
          <View style={{ flex: 1 }}>
            <GlobalSearchBar />
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
