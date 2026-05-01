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

function uniqueNames(items) {
  const seen = new Set();
  return items
    .map(item => String(item?.name || '').trim())
    .filter(name => {
      const key = name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pickExpiringItem(items) {
  return [...items]
    .filter(item => Number.isFinite(item.daysUntilExpiration))
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)[0];
}

function buildLocalFallbackRecipes(pantryDetails) {
  const names = uniqueNames(pantryDetails);
  if (!names.length) return [];

  const first = names[0];
  const second = names[1] || 'vegetables';
  const third = names[2] || 'rice';
  const expiring = pickExpiringItem(pantryDetails);
  const expiringName = expiring?.name || first;
  const haveAll = names.slice(0, 4);

  return [
    {
      name: `${first} Quick Skillet`,
      missing: ['oil', 'seasoning'],
      canCookNow: false,
      whyMatches: `Uses ${first} from your pantry for a fast meal idea.`,
      ingredientsNeed: ['oil', 'seasoning'],
      ingredientsHave: haveAll,
      estimatedCost: 4.5,
      timeMinutes: 15,
      servings: 1,
      steps: [
        `Chop or prepare ${first}.`,
        'Heat a pan with a little oil.',
        `Cook ${first} with ${second} until warm and tender.`,
        'Season, taste, and serve while hot.',
      ],
      substitution: 'Use butter or cooking spray if oil is not available.',
      missingItem: 'oil',
      cuisine: 'Home-style',
      difficulty: 'Easy',
      url: '',
    },
    {
      name: `${first} and ${third} Bowl`,
      missing: ['sauce'],
      canCookNow: false,
      whyMatches: 'Combines pantry items into a simple bowl that is easy to customize.',
      ingredientsNeed: ['sauce'],
      ingredientsHave: haveAll,
      estimatedCost: 5,
      timeMinutes: 20,
      servings: 2,
      steps: [
        `Cook or warm ${third}.`,
        `Add ${first} and ${second}.`,
        'Mix with your favorite sauce or seasoning.',
        'Serve in a bowl and add toppings if available.',
      ],
      substitution: 'Use salsa, soy sauce, dressing, or any sauce you already have.',
      missingItem: 'sauce',
      cuisine: 'Flexible',
      difficulty: 'Easy',
      url: '',
    },
    {
      name: `Use Soon: ${expiringName} Meal`,
      missing: [],
      canCookNow: true,
      whyMatches: expiring
        ? `${expiringName} is closest to expiring, so this helps reduce food waste.`
        : 'This idea uses what is already in your pantry.',
      ingredientsNeed: [],
      ingredientsHave: haveAll,
      estimatedCost: 3.5,
      timeMinutes: 12,
      servings: 1,
      steps: [
        `Start with ${expiringName}.`,
        'Add any matching pantry items you have.',
        'Cook, warm, or assemble depending on the ingredient.',
        'Taste and adjust seasoning before serving.',
      ],
      substitution: '',
      missingItem: null,
      cuisine: 'Pantry-friendly',
      difficulty: 'Easy',
      url: '',
    },
  ];
}

function isAbortSupported() {
  return typeof AbortController !== 'undefined';
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
    const controller = isAbortSupported() ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), 12000)
      : null;

    const response = await fetch(`${apiBase}/recipes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller?.signal,
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

    if (timeoutId) clearTimeout(timeoutId);

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
    return {
      recipes: buildLocalFallbackRecipes(pantryDetails),
      source: 'local-fallback',
      note: 'Recipe AI could not connect, so pantry-based backup recipes are shown for the demo.',
    };
  }

  return { recipes: [], source: 'empty', note: '' };
}

export async function getRecipeSuggestions(pantryItems = getPantryItems()) {
  const result = await getRecipeSuggestionResult(pantryItems);
  return result.recipes;
}