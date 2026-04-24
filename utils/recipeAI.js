import { getPantryItems } from './pantryStore';
import { getRecipeApiBase } from './apiBase';

function mapBackendRecipes(recipes) {
  return recipes.map(recipe => {
    const missingFromList = Array.isArray(recipe.ingredientsNeed)
      ? recipe.ingredientsNeed.filter(Boolean)
      : [];
    const missingFromSingle =
      typeof recipe.missingItem === 'string' && recipe.missingItem.trim()
        ? [recipe.missingItem.trim()]
        : [];

    const missing = missingFromList.length ? missingFromList : missingFromSingle;

    return {
      name: recipe.title || 'Recipe',
      missing,
      canCookNow: missing.length === 0,
      whyMatches: recipe.whyMatches || '',
      ingredientsNeed: missing,
      ingredientsHave: Array.isArray(recipe.ingredientsHave) ? recipe.ingredientsHave : [],
      estimatedCost:
        typeof recipe.estimatedCost === 'number' ? recipe.estimatedCost : null,
      timeMinutes:
        typeof recipe.timeMinutes === 'number' ? recipe.timeMinutes : null,
      servings: typeof recipe.servings === 'number' ? recipe.servings : null,
      url: recipe.url || '',
    };
  });
}

export async function getRecipeSuggestions(pantryItems = getPantryItems()) {
  const items = Array.isArray(pantryItems) ? pantryItems : [];
  const ingredientNames = items
    .map(item => String(item?.name || '').trim())
    .filter(Boolean);

  if (!ingredientNames.length) {
    return [];
  }

  const apiBase = getRecipeApiBase();

  try {
    const response = await fetch(`${apiBase}/recipes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ingredientNames,
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
      return mapBackendRecipes(backendRecipes);
    }
  } catch (e) {
    console.warn('getRecipeSuggestions:', e?.message || e);
    throw e;
  }

  return [];
}
