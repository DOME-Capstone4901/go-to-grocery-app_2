import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { addToGroceryList, getGroceryList } from '../../utils/groceryStore';
import { getPantryItems } from '../../utils/pantryStore';
import { getRecipeSuggestionResult } from '../../utils/recipeAI';
import { palette, shadows } from '../../utils/theme';

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

function displayList(items) {
  return Array.isArray(items) ? items.map(displayName).filter(Boolean) : [];
}

function groceryKey(value) {
  return displayName(value).toLowerCase().trim();
}

function recipeSearchUrl(recipe) {
  const terms = [
    recipe?.name,
    ...displayList(recipe?.ingredientsHave),
    'recipe',
  ]
    .map(displayName)
    .filter(Boolean)
    .join(' ');

  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
}

function compactList(items, fallback = 'None') {
  const cleaned = displayList(items);
  return cleaned.length ? cleaned.join(', ') : fallback;
}

export default function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [recipeNotice, setRecipeNotice] = useState('');
  const groceryNames = new Set(
    getGroceryList()
      .map(item => String(item?.name || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const refreshRecipes = useCallback(async (isActive = () => true) => {
    setLoading(true);
    setErrorMsg('');
    setRecipeNotice('');
    const pantryItems = getPantryItems();
    try {
      const result = await getRecipeSuggestionResult(pantryItems);
      if (isActive()) {
        setRecipes(result.recipes);
        if (result.note) {
          setRecipeNotice(result.note);
        } else if (result.source === 'local-fallback') {
          setRecipeNotice('Recipe AI is temporarily unavailable, so backup pantry suggestions are shown.');
        }
      }
    } catch (e) {
      if (isActive()) {
        setRecipes([]);
        setErrorMsg(
          'Recipe Hub could not connect right now. Make sure the recipe backend is running, then refresh.'
        );
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
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

      {!!recipeNotice && !loading && !errorMsg && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Demo-safe backup is on</Text>
          <Text style={styles.noticeText}>{recipeNotice}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Loading recipe ideas...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.emptyCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No recipes yet. Add more pantry ingredients and refresh.
          </Text>
        </View>
      ) : (
        recipes.map((recipe, index) => {
          const missingItems = displayList(recipe.missing);
          const pendingItems = missingItems.filter(item =>
            groceryNames.has(groceryKey(item))
          );
          const stillMissingItems = missingItems.filter(
            item => !groceryNames.has(groceryKey(item))
          );
          const waitingOnPurchase =
            !recipe.canCookNow &&
            stillMissingItems.length === 0 &&
            pendingItems.length > 0;

          return (
            <View key={`${recipe.name}-${index}`} style={styles.recipeCard}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              {!!recipe.whyMatches && (
                <Text style={styles.recipeMeta}>{recipe.whyMatches}</Text>
              )}
              {!!(recipe.cuisine || recipe.difficulty) && (
                <Text style={styles.recipeMeta}>
                  {[recipe.cuisine, recipe.difficulty].filter(Boolean).join(' - ')}
                </Text>
              )}
              <Text style={styles.recipeMeta}>
                {recipe.timeMinutes ? `${recipe.timeMinutes} min` : 'Time n/a'} -{' '}
                {recipe.estimatedCost != null ? `$${recipe.estimatedCost.toFixed(2)}` : 'Cost n/a'}
                {recipe.servings ? ` - ${recipe.servings} servings` : ''}
              </Text>
              <Text style={styles.sectionText}>
                Uses: {compactList(recipe.ingredientsHave)}
              </Text>
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

              {!!recipe.substitution && (
                <Text style={styles.sectionText}>Substitute: {recipe.substitution}</Text>
              )}

              {recipe.steps?.length > 0 && (
                <View style={styles.stepsBox}>
                  <Text style={styles.stepsTitle}>Quick steps</Text>
                  {recipe.steps.slice(0, 4).map((step, stepIndex) => (
                    <Text key={`${recipe.name}-step-${stepIndex}`} style={styles.stepText}>
                      {stepIndex + 1}. {step}
                    </Text>
                  ))}
                </View>
              )}

              {!recipe.canCookNow && stillMissingItems.length > 0 && (
                <Pressable
                  style={styles.addButton}
                  onPress={() => {
                    stillMissingItems.forEach(item => addToGroceryList({ name: item }));
                    Alert.alert(
                      'Added to grocery list',
                      `${stillMissingItems.join(', ')} added. Buy it, then add it to your pantry.`
                    );
                    refreshRecipes();
                  }}
                >
                  <Text style={styles.addButtonText}>Add Missing To Grocery List</Text>
                </Pressable>
              )}

              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  Linking.openURL(recipeSearchUrl(recipe)).catch(() => {});
                }}
              >
                <Text style={styles.linkButtonText}>Find Recipe Online</Text>
              </Pressable>
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
  errorText: {
    color: palette.peachDeep,
    fontSize: 15,
    lineHeight: 21,
  },
  noticeCard: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 13,
    marginBottom: 14,
  },
  noticeTitle: {
    color: palette.greenDeep,
    fontWeight: '800',
    fontSize: 13,
  },
  noticeText: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
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
  recipeMeta: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionText: {
    marginTop: 8,
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
  },
  stepsBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 10,
  },
  stepsTitle: {
    color: palette.greenDeep,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
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
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.greenDeep,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
