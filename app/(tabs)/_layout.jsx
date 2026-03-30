<<<<<<< HEAD
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      
      <Tabs.Screen
        name="MainPantryTab"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="groceryList"
        options={{
          title: 'Grocery List',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="addToPantry"
        options={{
          title: 'Add Item',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

=======
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#27AE60',
        tabBarInactiveTintColor: '#95A5A6',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E9ECEF',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
>>>>>>> 2bdb204334ae2a3572ce2e8344ea0252bf5e20c9
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
<<<<<<< HEAD
            <Ionicons name="barcode-outline" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
=======
            <Ionicons name="scan" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
>>>>>>> 2bdb204334ae2a3572ce2e8344ea0252bf5e20c9
}
