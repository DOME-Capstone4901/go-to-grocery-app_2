import { getPantryItems } from './pantryStore';
import { getRecipeApiBase } from './apiBase';
import { getDaysUntilExpiration } from './expiration';

function recipeItemName(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(recipeItemName).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    const candidate =
      value.name ||
      value.item ||
      value.ingredient ||
      value.productName ||
      value.title ||
      value.label ||
      value.value;
    return recipeItemName(candidate);
  }
  return '';
}

function recipeItemList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(recipeItemName).filter(Boolean);
}

function mapBackendRecipes(recipes) {
  return recipes.map(recipe => {
    const missingFromList = recipeItemList(recipe.ingredientsNeed);
    const missingFromSingle = recipeItemList([recipe.missingItem]);

    const missing = missingFromList.length ? missingFromList : missingFromSingle;

    return {
      name: recipeItemName(recipe.title) || 'Recipe',
      missing,
      canCookNow: missing.length === 0,
      whyMatches: recipeItemName(recipe.whyMatches) || '',
      ingredientsNeed: missing,
      ingredientsHave: recipeItemList(recipe.ingredientsHave),
      estimatedCost:
        typeof recipe.estimatedCost === 'number' ? recipe.estimatedCost : null,
      timeMinutes:
        typeof recipe.timeMinutes === 'number' ? recipe.timeMinutes : null,
      servings: typeof recipe.servings === 'number' ? recipe.servings : null,
      steps: recipeItemList(recipe.steps),
      substitution: recipeItemName(recipe.substitution),
      missingItem: recipeItemName(recipe.missingItem) || null,
      cuisine: recipeItemName(recipe.cuisine),
      difficulty: recipeItemName(recipe.difficulty),
      url: recipeItemName(recipe.url),
    };
  });
}

function mapPantryItemForAI(item) {
  const expirationDate = String(item?.expirationDate || '').trim();
  const daysUntilExpiration = expirationDate
    ? getDaysUntilExpiration(expirationDate)
    : null;

  return {
    name: String(item?.name || '').trim(),
    category: String(item?.category || '').trim(),
    quantity: item?.quantity ?? null,
    expirationDate,
    daysUntilExpiration:
      Number.isFinite(daysUntilExpiration) ? daysUntilExpiration : null,
  };
}

export async function getRecipeSuggestionResult(pantryItems = getPantryItems()) {
  const items = Array.isArray(pantryItems) ? pantryItems : [];
  const ingredientNames = items
    .map(item => String(item?.name || '').trim())
    .filter(Boolean);
  const pantryDetails = items
    .map(mapPantryItemForAI)
    .filter(item => item.name);

  if (!ingredientNames.length) {
    return { recipes: [], source: 'empty', note: '' };
  }

  const apiBase = getRecipeApiBase();

  try {
    const response = await fetch(`${apiBase}/recipes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ingredientNames,
        pantryItems: pantryDetails,
        restrictions: [],
        budget: 20,
        budgetType: 'per_meal',
        maxMissingItems: 2,
        maxResults: 6,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `Recipe request failed: ${response.status}`);
    }

    const data = await response.json();
    const backendRecipes = Array.isArray(data?.recipes) ? data.recipes : [];

    if (backendRecipes.length) {
      return {
        recipes: mapBackendRecipes(backendRecipes),
        source: data?.source || 'ai',
        note: data?.note || '',
      };
    }
  } catch (e) {
    console.warn('getRecipeSuggestions:', e?.message || e);
    throw e;
  }

  return { recipes: [], source: 'empty', note: '' };
}

export async function getRecipeSuggestions(pantryItems = getPantryItems()) {
  const result = await getRecipeSuggestionResult(pantryItems);
  return result.recipes;
}
