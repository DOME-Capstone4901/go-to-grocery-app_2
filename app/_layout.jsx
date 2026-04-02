import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadPantry } from '../utils/pantryStore';
import { loadGroceryList } from '../utils/groceryStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([loadPantry(), loadGroceryList()]).finally(() => {
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
      {ready ? <Slot /> : null}
    </GestureHandlerRootView>
  );
}
