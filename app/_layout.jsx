import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { loadPantry } from '../utils/pantryStore';

export default function RootLayout() {
  useEffect(() => {
    loadPantry();
  }, []);

  return <Slot />;
}
