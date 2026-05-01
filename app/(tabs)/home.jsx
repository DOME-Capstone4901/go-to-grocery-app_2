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

import { deletePantryItem, getPantryItems } from '../../utils/pantryStore';
import { getDaysUntilExpiration } from '../../utils/expiration';
import { isLowStock } from '../../utils/lowStock';
import { getPantrySuggestions } from '../../utils/suggestions';
import { getRecipeSuggestions } from '../../utils/recipeAI';
import { addToGroceryList, getGroceryList } from '../../utils/groceryStore';
import { scheduleExpirationAlerts } from '../../utils/notifications';
import { palette, shadows } from '../../utils/theme';
import { supabase } from '../../src/lib/supabase';

function displayName(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(displayName).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return displayName(
      value.name ||
        value.item ||
        value.ingredient ||
        value.productName ||
        value.title ||
        value.label ||
        value.value
    );
  }
  return '';
}

function displayList(value) {
  return Array.isArray(value) ? value.map(displayName).filter(Boolean) : [];
}

function groceryKey(value) {
  return displayName(value).toLowerCase().trim();
}

const quickActions = [
  { title: 'Pantry', caption: 'View items', route: '/(tabs)/MainPantryTab', color: palette.greenDeep },
  { title: 'Grocery', caption: 'Shopping list', route: '/(tabs)/groceryList', color: palette.orange },
  { title: 'Add Item', caption: 'Manual entry', route: '/(tabs)/addToPantry', color: palette.sun },
  { title: 'Scan', caption: 'Barcode + expiry', route: '/(tabs)/scan', color: palette.peachDeep },
  { title: 'Recipes', caption: 'AI ideas', route: '/(tabs)/recipes', color: palette.green },
  { title: 'Stores', caption: 'Compare prices', route: '/(tabs)/storeFinder', color: '#6B7F52' },
];

export default function HomeScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pantryCount, setPantryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [recipes, setRecipes] = useState([]);

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

    try {
      const recipeSuggestions = await getRecipeSuggestions(items);
      if (isActive()) {
        setRecipes(recipeSuggestions.slice(0, 3));
      }
    } catch {
      if (isActive()) {
        setRecipes([]);
      }
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

  const groceryNames = new Set(
    getGroceryList()
      .map(item => String(item?.name || '').toLowerCase().trim())
      .filter(Boolean)
  );

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
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.decorBlobOne} />
      <View style={styles.decorBlobTwo} />

      <View style={styles.headerCard}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>Go To Grocery</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Track pantry items, scan products, compare stores, and plan recipes.
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

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statSoftGreen]}>
          <Text style={styles.statNumber}>{pantryCount}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={[styles.statCard, styles.statSoftPeach]}>
          <Text style={[styles.statNumber, lowStockCount > 0 && styles.alertText]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={[styles.statCard, styles.statSoftCream]}>
          <Text style={[styles.statNumber, expiringSoonCount > 0 && styles.alertText]}>
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.title}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={() => router.push(action.route)}
            >
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionCaption}>{action.caption}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Smart Pantry Suggestions</Text>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <View key={`${suggestion.type}-${index}`} style={styles.infoCard}>
              <Text style={styles.infoText}>{suggestion.message}</Text>

              {suggestion.type === 'lowStock' && (
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => addToGroceryList(suggestion.item)}
                >
                  <Text style={styles.smallButtonText}>Add</Text>
                </TouchableOpacity>
              )}

              {suggestion.type === 'expiringSoon' && (
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => scheduleExpirationAlerts()}
                >
                  <Text style={styles.smallButtonText}>Remind</Text>
                </TouchableOpacity>
              )}

              {suggestion.type === 'expired' && (
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => {
                    deletePantryItem(suggestion.item.id);
                    refreshHome();
                  }}
                >
                  <Text style={styles.smallButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recipe Ideas</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/recipes')}>
            <Text style={styles.sectionLink}>Open Recipes</Text>
          </TouchableOpacity>
        </View>

        {recipes.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Add more pantry items to unlock AI recipe suggestions.
            </Text>
          </View>
        ) : (
          recipes.map((recipe, index) => {
            const missingItems = displayList(recipe.missing);
            const pendingItems = missingItems.filter(item => groceryNames.has(groceryKey(item)));
            const stillMissingItems = missingItems.filter(
              item => !groceryNames.has(groceryKey(item))
            );
            const waitingOnPurchase =
              !recipe.canCookNow &&
              stillMissingItems.length === 0 &&
              pendingItems.length > 0;

            return (
              <View key={`${recipe.name}-${index}`} style={styles.recipeCard}>
                <Text style={styles.recipeName}>{displayName(recipe.name) || 'Recipe'}</Text>
                {!!recipe.whyMatches && (
                  <Text style={styles.recipeMeta}>{displayName(recipe.whyMatches)}</Text>
                )}
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
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  container: {
    padding: 16,
    paddingBottom: 34,
    position: 'relative',
    overflow: 'hidden',
  },
  decorBlobOne: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 138,
    height: 138,
    borderRadius: 999,
    backgroundColor: '#F8D1B9',
    opacity: 0.22,
  },
  decorBlobTwo: {
    position: 'absolute',
    top: 154,
    left: -46,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#DDE6D5',
    opacity: 0.22,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F7EFE6',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 14,
    ...shadows.card,
  },
  headerTextWrap: {
    flex: 1,
  },
  kicker: {
    color: palette.orange,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: '800',
    color: palette.greenDeep,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: palette.greenDeep,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 82,
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.75,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  statSoftGreen: {
    backgroundColor: '#EEF5EA',
  },
  statSoftPeach: {
    backgroundColor: '#FBE6DD',
  },
  statSoftCream: {
    backgroundColor: '#F8F1E8',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  alertText: {
    color: palette.orange,
  },
  statLabel: {
    marginTop: 4,
    textAlign: 'center',
    color: palette.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.greenDeep,
    marginBottom: 10,
  },
  sectionLink: {
    color: palette.orange,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    minHeight: 78,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  actionCaption: {
    marginTop: 8,
    color: '#fff',
    opacity: 0.9,
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  infoText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  smallButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: palette.orange,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  recipeCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.card,
  },
  recipeName: {
    color: palette.greenDeep,
    fontSize: 16,
    fontWeight: '800',
  },
  recipeMeta: {
    marginTop: 5,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  readyText: {
    marginTop: 6,
    color: palette.success,
    fontWeight: '700',
  },
  missingText: {
    marginTop: 6,
    color: palette.peachDeep,
    fontWeight: '700',
  },
  pendingText: {
    marginTop: 6,
    color: palette.muted,
    fontWeight: '700',
  },
});
