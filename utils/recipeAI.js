import { getPantryItems } from './pantryStore';
import { RECIPES } from './recipes';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_RECIPE_BACKEND_URL || 'http://localhost:3000';

function getLocalRecipeSuggestions(items) {
  const pantry = items.map(i => i.name.toLowerCase());
  const suggestions = [];

  for (const recipe of RECIPES) {
    const missing = recipe.ingredients.filter(
      ing => !pantry.includes(ing.toLowerCase())
    );

    if (missing.length <= recipe.missingAllowed) {
      suggestions.push({
        name: recipe.name,
        missing,
        canCookNow: missing.length === 0,
      });
    }
  }

  return suggestions;
}

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

  try {
    const response = await fetch(`${BACKEND_URL}/recipes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ingredientNames,
        restrictions: [],
        budget: 20,
        budgetType: 'per_meal',
      }),
    });

    if (!response.ok) {
      throw new Error(`Recipe request failed: ${response.status}`);
    }

    const data = await response.json();
    const backendRecipes = Array.isArray(data?.recipes) ? data.recipes : [];

    if (backendRecipes.length) {
      return mapBackendRecipes(backendRecipes);
    }
  } catch {
    // Fall back to local static matching when backend is unavailable.
  }

  return getLocalRecipeSuggestions(items);
}
