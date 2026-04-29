import { Redirect } from 'expo-router';

// The real home lives inside the (tabs) group so the tab bar is always visible.
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
