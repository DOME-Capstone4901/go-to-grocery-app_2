<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';

import { getPantryItems, deletePantryItem } from '../utils/pantryStore';
import { getDaysUntilExpiration } from '../utils/expiration';
import { isLowStock } from '../utils/lowStock';

import { getPantrySuggestions } from '../utils/suggestions';
import { getRecipeSuggestions } from '../utils/recipeAI';

import { addToGroceryList } from '../utils/groceryStore';
import { scheduleExpirationAlerts } from '../utils/notifications';

export default function HomeScreen() {
  const [pantryCount, setPantryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);

  const [suggestions, setSuggestions] = useState([]);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const items = getPantryItems();

    setPantryCount(items.length);
    setLowStockCount(items.filter(i => isLowStock(i)).length);

    setExpiringSoonCount(
      items.filter(i => {
        const days = getDaysUntilExpiration(i.expirationDate);
        return days >= 0 && days <= 3;
      }).length
    );

    setSuggestions(getPantrySuggestions(items));
    setRecipes(getRecipeSuggestions());

    scheduleExpirationAlerts();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Pantry App</Text>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pantryCount}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, lowStockCount > 0 && styles.alertText]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statNumber, expiringSoonCount > 0 && styles.alertText]}>
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
      </View>

      {/* AI Pantry Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          <Text style={styles.sectionTitle}>Smart Pantry Suggestions</Text>

          {suggestions.map((s, index) => (
            <View key={index} style={styles.suggestionCard}>
              <Text style={styles.suggestionText}>{s.message}</Text>

              {s.type === 'lowStock' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => addToGroceryList(s.item)}
                >
                  <Text style={styles.suggestionButtonText}>Add</Text>
                </TouchableOpacity>
              )}

              {s.type === 'expiringSoon' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => scheduleExpirationAlerts()}
                >
                  <Text style={styles.suggestionButtonText}>Remind Me</Text>
                </TouchableOpacity>
              )}

              {s.type === 'expired' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => deletePantryItem(s.item.id)}
                >
                  <Text style={styles.suggestionButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* AI Recipe Suggestions */}
      {recipes.length > 0 && (
        <View style={styles.recipeBox}>
          <Text style={styles.sectionTitle}>Recipe Ideas</Text>

          {recipes.map((r, index) => (
            <View key={index} style={styles.recipeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recipeName}>{r.name}</Text>

                {r.canCookNow ? (
                  <Text style={styles.readyText}>You can cook this now</Text>
                ) : (
                  <Text style={styles.missingText}>
                    Missing: {r.missing.join(', ')}
                  </Text>
                )}
              </View>

              {!r.canCookNow && (
                <TouchableOpacity
                  style={styles.recipeButton}
                  onPress={() => {
                    r.missing.forEach(m => addToGroceryList({ name: m }));
                  }}
                >
                  <Text style={styles.recipeButtonText}>Add Missing</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Navigation Buttons */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/MainPantryTab')}>
        <Text style={styles.buttonText}>View Pantry</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/groceryList')}>
        <Text style={styles.buttonText}>Grocery List</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/addToPantry')}>
        <Text style={styles.buttonText}>Add New Item</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/scan')}>
        <Text style={styles.buttonText}>Scan Barcode</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 30,
    color: '#333',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  alertText: {
    color: '#d32f2f',
  },
  statLabel: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },

  // Suggestions
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  suggestionBox: {
    width: '100%',
    marginBottom: 25,
  },
  suggestionCard: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  suggestionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  suggestionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Recipes
  recipeBox: {
    width: '100%',
    marginBottom: 25,
  },
  recipeCard: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  readyText: {
    color: '#2e7d32',
    marginTop: 4,
  },
  missingText: {
    color: '#d32f2f',
    marginTop: 4,
  },
  recipeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  recipeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Buttons
  button: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 18,
  },
});
=======
import { Redirect } from "expo-router"
export default function Index() {
  return <Redirect href="/(screens)/WelcomeScreen" />
}
>>>>>>> 2bdb204334ae2a3572ce2e8344ea0252bf5e20c9
