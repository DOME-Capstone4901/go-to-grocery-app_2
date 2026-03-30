<<<<<<< HEAD
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { loadPantry } from '../utils/pantryStore';

export default function RootLayout() {
  useEffect(() => {
    loadPantry();
  }, []);

  return <Slot />;
=======
import { Stack } from 'expo-router'
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
>>>>>>> 2bdb204334ae2a3572ce2e8344ea0252bf5e20c9
}
