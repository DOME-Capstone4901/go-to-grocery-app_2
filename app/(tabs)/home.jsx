import React, { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deletePantryItem, getPantryItems } from '../../utils/pantryStore';
import { getDaysUntilExpiration } from '../../utils/expiration';
import { isLowStock } from '../../utils/lowStock';
import { getPantrySuggestions } from '../../utils/suggestions';
import { getRecipeSuggestions } from '../../utils/recipeAI';
import { addToGroceryList, getGroceryList } from '../../utils/groceryStore';
import { scheduleExpirationAlerts } from '../../utils/notifications';
import { palette, shadows } from '../../utils/theme';
import { supabase } from '../../src/lib/supabase';

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

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const authenticated = Boolean(session);
      setIsAuthenticated(authenticated);
      setSessionChecked(true);
      if (!authenticated) router.replace('/login');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
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
      if (isActive()) setRecipes(recipeSuggestions);
    } catch {
      if (isActive()) setRecipes([]);
    }

    scheduleExpirationAlerts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return undefined;
      let active = true;
      refreshHome(() => active);
      return () => { active = false; };
    }, [isAuthenticated, refreshHome])
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) { Alert.alert('Logout failed', error.message); return; }
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // ── Gates ─────────────────────────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <View style={styles.authGate}>
        <ActivityIndicator size="large" color={palette.orange} />
      </View>
    );
  }
  if (!isAuthenticated) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Welcome Back 👋</Text>
          <Text style={styles.subtitle}>
            Here's what's happening in your pantry.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? <ActivityIndicator size="small" color={palette.surface} />
            : <Text style={styles.logoutButtonText}>Log Out</Text>}
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statNumber}>{pantryCount}</Text>
          <Text style={styles.statLabel}>Total{'\n'}Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statNumber, lowStockCount > 0 && styles.alertNumber]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Low{'\n'}Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
          <Text style={[styles.statNumber, expiringSoonCount > 0 && styles.alertNumber]}>
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>Expiring{'\n'}Soon</Text>
        </View>
      </View>

      {/* Quick navigation tiles */}
      <View style={styles.tilesRow}>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: palette.greenDeep }]}
          onPress={() => router.push('/(tabs)/MainPantryTab')}
        >
          <Text style={styles.tileIcon}>🥫</Text>
          <Text style={styles.tileLabel}>My Pantry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: palette.orange }]}
          onPress={() => router.push('/(tabs)/groceryList')}
        >
          <Text style={styles.tileIcon}>🛒</Text>
          <Text style={styles.tileLabel}>Grocery List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: palette.sun }]}
          onPress={() => router.push('/(tabs)/addToPantry')}
        >
          <Text style={styles.tileIcon}>➕</Text>
          <Text style={styles.tileLabel}>Add Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: palette.peachDeep }]}
          onPress={() => router.push('/(tabs)/recipes')}
        >
          <Text style={styles.tileIcon}>🍽️</Text>
          <Text style={styles.tileLabel}>Recipes</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Suggestions</Text>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={[styles.card, shadows.card]}>
              <Text style={styles.cardText}>{suggestion.message}</Text>
              {suggestion.type === 'lowStock' && (
                <TouchableOpacity
                  style={styles.cardButton}
                  onPress={() => addToGroceryList(suggestion.item)}
                >
                  <Text style={styles.cardButtonText}>Add to Grocery List</Text>
                </TouchableOpacity>
              )}
              {suggestion.type === 'expiringSoon' && (
                <TouchableOpacity
                  style={styles.cardButton}
                  onPress={() => scheduleExpirationAlerts()}
                >
                  <Text style={styles.cardButtonText}>Remind Me</Text>
                </TouchableOpacity>
              )}
              {suggestion.type === 'expired' && (
                <TouchableOpacity
                  style={[styles.cardButton, { backgroundColor: palette.danger }]}
                  onPress={() => {
                    deletePantryItem(suggestion.item.id);
                    refreshHome();
                  }}
                >
                  <Text style={styles.cardButtonText}>Remove Item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recipe Ideas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipe Ideas</Text>
        {recipes.length === 0 ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.mutedText}>
              Add more pantry items to unlock recipe suggestions.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={() => router.push('/(tabs)/recipes')}
            >
              <Text style={styles.cardButtonText}>Open Recipes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recipes.map((recipe, index) => {
            const stillMissingItems = recipe.missing.filter(
              item => !groceryNames.has(String(item).toLowerCase().trim())
            );
            const pendingItems = recipe.missing.filter(
              item => groceryNames.has(String(item).toLowerCase().trim())
            );
            const waitingOnPurchase =
              !recipe.canCookNow &&
              stillMissingItems.length === 0 &&
              pendingItems.length > 0;

            return (
              <View key={index} style={[styles.card, styles.recipeCard, shadows.card]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  {recipe.canCookNow ? (
                    <Text style={styles.readyText}>✅ You can cook this now</Text>
                  ) : waitingOnPurchase ? (
                    <Text style={styles.pendingText}>
                      🛒 Added to list — buy and add to pantry.
                    </Text>
                  ) : (
                    <Text style={styles.mutedText}>
                      Missing: {stillMissingItems.join(', ')}
                    </Text>
                  )}
                </View>
                {!recipe.canCookNow && stillMissingItems.length > 0 && (
                  <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => {
                      stillMissingItems.forEach(item => addToGroceryList({ name: item }));
                      refreshHome();
                    }}
                  >
                    <Text style={styles.cardButtonText}>Add Missing</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Bottom breathing room above tab bar */}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  container: {
    padding: 16,
    paddingTop: 20,
  },
  authGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: palette.muted,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: palette.greenDeep,
    borderRadius: 8,
  },
  logoutButtonDisabled: { opacity: 0.6 },
  logoutButtonText: {
    color: palette.surface,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  alertNumber: {
    color: palette.danger,
  },
  statLabel: {
    fontSize: 11,
    color: palette.muted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Quick nav tiles ───────────────────────────────────────────────────────
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tile: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: 22 },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardText: {
    fontSize: 14,
    color: palette.text,
    lineHeight: 20,
  },
  cardButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: palette.orange,
    borderRadius: 8,
  },
  cardButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Recipe card specifics ─────────────────────────────────────────────────
  recipeName: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 3,
  },
  readyText: {
    fontSize: 13,
    color: palette.success,
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 13,
    color: palette.orange,
    fontWeight: '500',
  },
  mutedText: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 2,
  },
});
