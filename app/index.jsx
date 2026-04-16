import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { deletePantryItem, getPantryItems } from '../utils/pantryStore';
import { getDaysUntilExpiration } from '../utils/expiration';
import { isLowStock } from '../utils/lowStock';
import { getPantrySuggestions } from '../utils/suggestions';
import { getRecipeSuggestions } from '../utils/recipeAI';
import { addToGroceryList, getGroceryList } from '../utils/groceryStore';
import { scheduleExpirationAlerts } from '../utils/notifications';
import { palette, shadows } from '../utils/theme';
import { supabase } from '../src/lib/supabase';

export default function HomeScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pantryCount, setPantryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const groceryNames = new Set(
    getGroceryList()
      .map(item => String(item?.name || '').toLowerCase().trim())
      .filter(Boolean)
  );

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setIsAuthenticated(false);
        setSessionChecked(true);
        router.replace('/login');
        return;
      }

      setIsAuthenticated(true);
      setSessionChecked(true);
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const authenticated = Boolean(session);
      setIsAuthenticated(authenticated);
      setSessionChecked(true);

      if (!authenticated) {
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshHome = useCallback(async (isActive = () => true) => {
    const items = getPantryItems();

    setPantryCount(items.length);
    setLowStockCount(items.filter(item => isLowStock(item)).length);
    setExpiringSoonCount(
      items.filter(item => {
        const days = getDaysUntilExpiration(item.expirationDate);
        return Number.isFinite(days) && days >= 0 && days <= 3;
      }).length
    );
    setSuggestions(getPantrySuggestions(items));

    const recipeSuggestions = await getRecipeSuggestions(items);
    if (isActive()) {
      setRecipes(recipeSuggestions);
    }

    scheduleExpirationAlerts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        return undefined;
      }

      let active = true;
      refreshHome(() => active);

      return () => {
        active = false;
      };
    }, [isAuthenticated, refreshHome])
  );

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert('Logout failed', error.message);
        return;
      }

      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!sessionChecked) {
    return (
      <View style={styles.authGate}>
        <ActivityIndicator size="large" color={palette.greenDeep} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />
      <View style={styles.decorRibbon} />
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>My Pantry App</Text>
            <Text style={styles.heroSubtitle}>
              Plan smarter shopping and keep your pantry fresh.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.logoutButtonText}>Log Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardSoftGreen]}>
          <Text style={styles.statNumber}>{pantryCount}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>

        <View style={[styles.statCard, styles.statCardSoftPeach]}>
          <Text style={[styles.statNumber, lowStockCount > 0 && styles.alertText]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>

        <View style={[styles.statCard, styles.statCardSoftCream]}>
          <Text
            style={[styles.statNumber, expiringSoonCount > 0 && styles.alertText]}
          >
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          <Text style={styles.sectionTitle}>Smart Pantry Suggestions</Text>

          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionCard}>
              <Text style={styles.suggestionText}>{suggestion.message}</Text>

              {suggestion.type === 'lowStock' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => addToGroceryList(suggestion.item)}
                >
                  <Text style={styles.suggestionButtonText}>Add</Text>
                </TouchableOpacity>
              )}

              {suggestion.type === 'expiringSoon' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => scheduleExpirationAlerts()}
                >
                  <Text style={styles.suggestionButtonText}>Remind Me</Text>
                </TouchableOpacity>
              )}

              {suggestion.type === 'expired' && (
                <TouchableOpacity
                  style={styles.suggestionButton}
                  onPress={() => {
                    deletePantryItem(suggestion.item.id);
                    refreshHome();
                  }}
                >
                  <Text style={styles.suggestionButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {recipes.length > 0 && (
        <View style={styles.recipeBox}>
          <Text style={styles.sectionTitle}>Recipe Ideas</Text>

          {recipes.map((recipe, index) => {
            const pendingItems = recipe.missing.filter(item =>
              groceryNames.has(String(item).toLowerCase().trim())
            );
            const stillMissingItems = recipe.missing.filter(
              item => !groceryNames.has(String(item).toLowerCase().trim())
            );
            const waitingOnPurchase =
              !recipe.canCookNow &&
              stillMissingItems.length === 0 &&
              pendingItems.length > 0;

            return (
              <View key={index} style={styles.recipeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>

                  {recipe.canCookNow ? (
                    <Text style={styles.readyText}>You can cook this now</Text>
                  ) : waitingOnPurchase ? (
                    <Text style={styles.pendingText}>
                      Added to grocery list. Buy it and add to pantry.
                    </Text>
                  ) : (
                    <Text style={styles.missingText}>
                      Missing: {stillMissingItems.join(', ')}
                    </Text>
                  )}
                </View>

                {!recipe.canCookNow && stillMissingItems.length > 0 && (
                  <TouchableOpacity
                    style={styles.recipeButton}
                    onPress={() => {
                      stillMissingItems.forEach(item => addToGroceryList({ name: item }));
                      refreshHome();
                    }}
                  >
                    <Text style={styles.recipeButtonText}>Add Missing</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {recipes.length === 0 && (
        <View style={styles.recipeBox}>
          <Text style={styles.sectionTitle}>Recipe Ideas</Text>
          <Text style={styles.emptyRecipeText}>
            Add more pantry items to unlock recipe suggestions.
          </Text>
          <TouchableOpacity
            style={styles.recipeButton}
            onPress={() => router.push('/recipes')}
          >
            <Text style={styles.recipeButtonText}>Open Recipes</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/MainPantryTab')}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>View Pantry</Text>
          <Text style={styles.buttonArrow}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/groceryList')}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Grocery List</Text>
          <Text style={styles.buttonArrow}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/addToPantry')}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Add New Item</Text>
          <Text style={styles.buttonArrow}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/scan')}>
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Scan Barcode</Text>
          <Text style={styles.buttonArrow}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/recipes')}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Recipe Page</Text>
          <Text style={styles.buttonArrow}>{'>'}</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  container: {
    padding: 25,
    backgroundColor: palette.bg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -28,
    right: -34,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: '#F9D2B8',
    opacity: 0.32,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 92,
    left: -44,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: '#E2E9D7',
    opacity: 0.28,
  },
  decorRibbon: {
    position: 'absolute',
    top: 168,
    right: 18,
    width: 70,
    height: 10,
    borderRadius: 99,
    backgroundColor: palette.orange,
    opacity: 0.18,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: palette.greenDeep,
    letterSpacing: 0.2,
  },
  heroCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F7EFE6',
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 20,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    alignItems: 'center',
  },
  heroSubtitle: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: palette.greenDeep,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.green,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.75,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  statCardSoftGreen: {
    backgroundColor: '#EEF5EA',
  },
  statCardSoftPeach: {
    backgroundColor: '#FBE6DD',
  },
  statCardSoftCream: {
    backgroundColor: '#F8F1E8',
  },
  statNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  alertText: {
    color: palette.orange,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 14,
    color: palette.muted,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 12,
    color: palette.greenDeep,
  },
  suggestionBox: {
    width: '100%',
    marginBottom: 25,
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#F6EEE5',
    borderWidth: 1,
    borderColor: palette.border,
  },
  suggestionCard: {
    backgroundColor: palette.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: palette.text,
  },
  suggestionButton: {
    backgroundColor: palette.orange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
  },
  suggestionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  recipeBox: {
    width: '100%',
    marginBottom: 25,
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#F3EDE4',
    borderWidth: 1,
    borderColor: palette.border,
  },
  recipeCard: {
    backgroundColor: palette.surfaceAlt,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.greenDeep,
  },
  readyText: {
    color: palette.success,
    marginTop: 4,
  },
  missingText: {
    color: palette.peachDeep,
    marginTop: 4,
  },
  pendingText: {
    color: palette.muted,
    marginTop: 4,
    fontWeight: '600',
  },
  recipeButton: {
    backgroundColor: palette.peachDeep,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECAF9A',
    borderBottomWidth: 2,
    borderBottomColor: '#A75740',
  },
  recipeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyRecipeText: {
    color: palette.muted,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    backgroundColor: palette.orange,
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 14,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 3,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  buttonInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  buttonArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
