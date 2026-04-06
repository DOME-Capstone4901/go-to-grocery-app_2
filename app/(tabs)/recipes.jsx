import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { addToGroceryList, getGroceryList } from '../../utils/groceryStore';
import { getPantryItems } from '../../utils/pantryStore';
import { getRecipeSuggestions } from '../../utils/recipeAI';
import { palette, shadows } from '../../utils/theme';

export default function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const groceryNames = new Set(
    getGroceryList()
      .map(item => String(item?.name || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const refreshRecipes = useCallback(async (isActive = () => true) => {
    setLoading(true);
    const pantryItems = getPantryItems();
    const nextRecipes = await getRecipeSuggestions(pantryItems);
    if (isActive()) {
      setRecipes(nextRecipes);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshRecipes(() => active);
      return () => {
        active = false;
      };
    }, [refreshRecipes])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Recipe Hub</Text>
        <Text style={styles.subtitle}>
          Suggestions are generated from your pantry ingredients.
        </Text>
      </View>

      <Pressable style={styles.refreshButton} onPress={() => refreshRecipes()}>
        <Text style={styles.refreshButtonText}>Refresh Recipes</Text>
      </Pressable>

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Loading recipe ideas...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No recipes yet. Add more pantry ingredients and refresh.
          </Text>
        </View>
      ) : (
        recipes.map((recipe, index) => {
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
            <View key={`${recipe.name}-${index}`} style={styles.recipeCard}>
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

              {!recipe.canCookNow && stillMissingItems.length > 0 && (
                <Pressable
                  style={styles.addButton}
                  onPress={() => {
                    stillMissingItems.forEach(item => addToGroceryList({ name: item }));
                    refreshRecipes();
                  }}
                >
                  <Text style={styles.addButtonText}>Add Missing To Grocery List</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: palette.bg,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: '#F7EFE6',
    borderColor: palette.border,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    ...shadows.card,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.greenDeep,
  },
  subtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: palette.orange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderTopWidth: 1,
    borderTopColor: palette.orangeSoft,
    borderBottomWidth: 2,
    borderBottomColor: palette.orangeDeep,
    ...shadows.card,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  recipeCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 15,
    marginBottom: 12,
    ...shadows.card,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.greenDeep,
  },
  readyText: {
    marginTop: 6,
    color: palette.success,
    fontWeight: '600',
  },
  missingText: {
    marginTop: 6,
    color: palette.peachDeep,
    fontWeight: '600',
  },
  pendingText: {
    marginTop: 6,
    color: palette.muted,
    fontWeight: '600',
  },
  addButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: palette.peachDeep,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECAF9A',
    borderBottomWidth: 2,
    borderBottomColor: '#A75740',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
