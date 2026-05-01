import { Platform } from 'react-native';
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

function normalizeKey(value) {
  return recipeItemName(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleCase(value) {
  return recipeItemName(value)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function uniqueCleanList(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const cleaned = recipeItemName(value);
    const key = normalizeKey(cleaned);
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function mapBackendRecipes(recipes) {
  return recipes.map(recipe => {
    const have = uniqueCleanList(recipeItemList(recipe.ingredientsHave));
    const needFromList = uniqueCleanList(recipeItemList(recipe.ingredientsNeed));
    const needFromSingle = uniqueCleanList(recipeItemList([recipe.missingItem]));
    const missing = needFromList.length ? needFromList : needFromSingle;

    return {
      name: recipeItemName(recipe.title) || 'Recipe',
      missing,
      canCookNow: missing.length === 0,
      whyMatches: recipeItemName(recipe.whyMatches) || '',
      ingredientsNeed: missing,
      ingredientsHave: have,
      estimatedCost:
        typeof recipe.estimatedCost === 'number' ? recipe.estimatedCost : null,
      timeMinutes:
        typeof recipe.timeMinutes === 'number' ? recipe.timeMinutes : null,
      servings: typeof recipe.servings === 'number' ? recipe.servings : null,
      steps: uniqueCleanList(recipeItemList(recipe.steps)),
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

function makePantryIndex(items) {
  const names = uniqueCleanList(items.map(item => item.name));
  const keys = new Set(names.map(normalizeKey));

  const find = keywords => {
    const words = Array.isArray(keywords) ? keywords : [keywords];
    return names.find(name => {
      const key = normalizeKey(name);
      return words.some(word => key.includes(normalizeKey(word)));
    });
  };

  const has = keywords => Boolean(find(keywords));

  return { names, keys, find, has };
}

function pickExpiringItem(items) {
  return [...items]
    .filter(item => Number.isFinite(item.daysUntilExpiration))
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)[0];
}

function filterMissing(candidates, pantryKeys) {
  return uniqueCleanList(candidates).filter(item => !pantryKeys.has(normalizeKey(item))).slice(0, 2);
}

function recipeCard({ title, cuisine, have, need = [], why, steps, substitution = '', cost = 5, time = 20, servings = 2 }, pantryKeys) {
  const ingredientsHave = uniqueCleanList(have).slice(0, 5);
  const ingredientsNeed = filterMissing(need, pantryKeys);

  return {
    name: title,
    missing: ingredientsNeed,
    canCookNow: ingredientsNeed.length === 0,
    whyMatches: why,
    ingredientsNeed,
    ingredientsHave,
    estimatedCost: cost,
    timeMinutes: time,
    servings,
    steps: steps.slice(0, 5),
    substitution: ingredientsNeed.length ? substitution : '',
    missingItem: ingredientsNeed[0] || null,
    cuisine,
    difficulty: 'Easy',
    url: '',
  };
}

function buildLocalFallbackRecipes(pantryDetails) {
  const index = makePantryIndex(pantryDetails);
  const { names, keys, find, has } = index;
  if (!names.length) return [];

  const expiring = pickExpiringItem(pantryDetails);
  const expiringName = expiring?.name;
  const rice = find(['rice', 'quinoa']);
  const eggs = find(['egg']);
  const chicken = find(['chicken', 'turkey']);
  const pasta = find(['pasta', 'spaghetti', 'penne', 'macaroni']);
  const tomato = find(['tomato', 'marinara', 'pasta sauce']);
  const beans = find(['beans', 'black bean', 'kidney bean', 'chickpea']);
  const bread = find(['bread', 'tortilla', 'bun', 'bagel']);
  const milk = find(['milk', 'yogurt']);
  const oats = find(['oat', 'cereal']);
  const banana = find(['banana', 'berry', 'apple']);
  const potato = find(['potato', 'sweet potato']);
  const produce = find(['broccoli', 'spinach', 'lettuce', 'pepper', 'onion', 'carrot', 'zucchini', 'vegetable']);
  const cheese = find(['cheese', 'cheddar', 'mozzarella', 'parmesan']);

  const ideas = [];
  const add = idea => {
    if (!idea) return;
    const key = normalizeKey(idea.title);
    if (ideas.some(existing => normalizeKey(existing.title) === key)) return;
    ideas.push(idea);
  };

  if (eggs && rice) {
    add({
      title: `${titleCase(eggs)} and ${titleCase(rice)} Breakfast Bowl`,
      cuisine: 'American/Home-style',
      have: [eggs, rice, produce].filter(Boolean),
      need: ['green onion', 'cheese'],
      why: `Uses ${eggs} and ${rice}, two pantry staples that make a quick filling meal.`,
      steps: [
        `Warm or cook ${rice}.`,
        `Scramble or fry ${eggs}.`,
        produce ? `Add chopped ${produce} for extra flavor.` : 'Add any vegetable you have for extra flavor.',
        'Layer everything in a bowl and season to taste.',
      ],
      substitution: 'Use any vegetable, salsa, or shredded cheese you already have.',
      cost: 4.5,
      time: 15,
      servings: 1,
    });
  }

  if (chicken && rice) {
    add({
      title: `${titleCase(chicken)} Rice Dinner Bowl`,
      cuisine: 'American/Home-style',
      have: [chicken, rice, produce].filter(Boolean),
      need: ['broth', 'onion'],
      why: `Turns ${chicken} and ${rice} into a complete dinner without a complicated recipe.`,
      steps: [
        `Cook ${chicken} until fully done.`,
        `Warm ${rice} separately.`,
        produce ? `Saute ${produce} and mix it in.` : 'Add any available vegetable if you have one.',
        'Combine everything and add a small splash of broth or sauce if available.',
      ],
      substitution: 'Use water with seasoning if broth is not available.',
      cost: 6,
      time: 25,
      servings: 2,
    });
  }

  if (pasta) {
    add({
      title: `${titleCase(pasta)} Pantry Pasta`,
      cuisine: 'Italian',
      have: [pasta, tomato, cheese, produce].filter(Boolean),
      need: tomato ? ['garlic'] : ['tomato sauce', 'garlic'],
      why: `${pasta} is easy to turn into a warm meal with sauce or vegetables.`,
      steps: [
        `Boil ${pasta} until tender.`,
        tomato ? `Warm ${tomato} as the sauce.` : 'Warm tomato sauce if you have it, or use a small amount of butter/cheese.',
        produce ? `Stir in ${produce}.` : 'Stir in any pantry vegetable if available.',
        cheese ? `Top with ${cheese}.` : 'Taste and add seasoning before serving.',
      ],
      substitution: 'Use canned tomatoes, marinara, or a little butter and cheese.',
      cost: 5,
      time: 20,
      servings: 2,
    });
  }

  if (beans || (rice && produce)) {
    add({
      title: `${titleCase(beans || rice)} Indian-Style Pantry Bowl`,
      cuisine: 'Indian-inspired',
      have: [beans, rice, produce, chicken].filter(Boolean),
      need: ['curry powder', 'onion'],
      why: 'Adds variety with a warm curry-style bowl using simple pantry ingredients.',
      steps: [
        beans ? `Warm ${beans} in a pan.` : `Start with warm ${rice}.`,
        produce ? `Add ${produce} and cook until tender.` : 'Add any vegetable you have.',
        'Stir in curry-style seasoning if available.',
        rice ? `Serve over ${rice}.` : 'Serve as a bowl or with bread.',
      ],
      substitution: 'Use cumin, paprika, chili powder, or any spice blend you have.',
      cost: 5.5,
      time: 22,
      servings: 2,
    });
  }

  if (bread && (eggs || cheese || produce)) {
    add({
      title: `${titleCase(bread)} Pantry Melt`,
      cuisine: 'American/Home-style',
      have: [bread, eggs, cheese, produce].filter(Boolean),
      need: ['tomato'],
      why: `Uses ${bread} with pantry fillings for a quick sandwich-style meal.`,
      steps: [
        `Toast or warm ${bread}.`,
        eggs ? `Cook ${eggs} as the main filling.` : cheese ? `Add ${cheese} as the main filling.` : `Add ${produce}.`,
        produce ? `Layer in ${produce}.` : 'Add any available vegetable if you have one.',
        'Serve warm as a quick breakfast or lunch.',
      ],
      substitution: 'Use lettuce, tomato, onion, or any leftover vegetable.',
      cost: 4,
      time: 12,
      servings: 1,
    });
  }

  if ((milk || oats) && banana) {
    add({
      title: `${titleCase(banana)} Breakfast Smoothie Bowl`,
      cuisine: 'Breakfast',
      have: [banana, milk, oats].filter(Boolean),
      need: ['peanut butter'],
      why: `Uses ${banana}${milk ? ` and ${milk}` : ''} for a fast breakfast idea.`,
      steps: [
        `Slice ${banana}.`,
        milk ? `Blend or mix with ${milk}.` : 'Mix with yogurt or milk if available.',
        oats ? `Add ${oats} for texture.` : 'Add oats or cereal if available.',
        'Serve cold as a smoothie or bowl.',
      ],
      substitution: 'Use yogurt, cereal, nuts, or honey if peanut butter is not available.',
      cost: 3.5,
      time: 8,
      servings: 1,
    });
  }

  if (potato) {
    add({
      title: `${titleCase(potato)} Pantry Hash`,
      cuisine: 'American/Home-style',
      have: [potato, eggs, produce, cheese].filter(Boolean),
      need: ['onion'],
      why: `${potato} works well as a filling base for breakfast or dinner.`,
      steps: [
        `Dice ${potato} into small pieces.`,
        'Cook until browned and tender.',
        eggs ? `Add ${eggs} near the end.` : produce ? `Stir in ${produce}.` : 'Add any available topping.',
        'Serve hot with any sauce or seasoning you like.',
      ],
      substitution: 'Use peppers, carrots, or any chopped vegetable instead of onion.',
      cost: 4.25,
      time: 25,
      servings: 2,
    });
  }

  if (expiringName) {
    add({
      title: `Use Soon: ${titleCase(expiringName)} Meal`,
      cuisine: 'Pantry-friendly',
      have: uniqueCleanList([expiringName, ...names.filter(name => name !== expiringName)]).slice(0, 4),
      need: [],
      why: `${expiringName} is closest to expiring, so this helps reduce food waste.`,
      steps: [
        `Start with ${expiringName}.`,
        'Pair it with one or two pantry ingredients that match the flavor.',
        'Cook, warm, or assemble depending on the item.',
        'Taste and serve before the item expires.',
      ],
      cost: 3.5,
      time: 15,
      servings: 1,
    });
  }

  add({
    title: `${titleCase(names[0])} Simple Pantry Plate`,
    cuisine: 'Flexible',
    have: names.slice(0, 4),
    need: ['fresh vegetable'],
    why: 'A simple backup idea that uses what is already saved in your pantry.',
    steps: [
      `Use ${names[0]} as the main ingredient.`,
      names[1] ? `Add ${names[1]} to make it more filling.` : 'Add another pantry item if available.',
      'Warm, toast, or assemble based on the ingredient type.',
      'Serve with a vegetable, sauce, or topping if available.',
    ],
    substitution: 'Use any fruit, vegetable, sauce, or topping you already have.',
    cost: 4,
    time: 15,
    servings: 1,
  });

  return ideas.slice(0, 5).map(idea => recipeCard(idea, keys));
}

function isAbortSupported() {
  return typeof AbortController !== 'undefined';
}

function recipeApiCandidates() {
  const bases = [];
  try {
    bases.push(getRecipeApiBase());
  } catch {
    // Missing env should not break the demo; local fallback recipes still work.
  }

  // If the phone IP is saved in .env.local, web testing can still use localhost.
  if (Platform.OS === 'web') {
    bases.push('http://localhost:3001');
  }

  return [...new Set(bases.map(base => String(base || '').replace(/\/$/, '')).filter(Boolean))];
}

async function fetchRecipePayload(apiBase, ingredientNames, pantryDetails) {
  const controller = isAbortSupported() ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 65000) : null;

  try {
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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `Recipe request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function getRecipeSuggestionResult(pantryItems = getPantryItems()) {
  const items = Array.isArray(pantryItems) ? pantryItems : [];
  const ingredientNames = uniqueCleanList(items.map(item => item?.name));
  const pantryDetails = items.map(mapPantryItemForAI).filter(item => item.name);

  if (!ingredientNames.length) {
    return { recipes: [], source: 'empty', note: '' };
  }

  const fallbackRecipes = buildLocalFallbackRecipes(pantryDetails);
  const bases = recipeApiCandidates();
  let lastError = null;

  for (const apiBase of bases) {
    try {
      const data = await fetchRecipePayload(apiBase, ingredientNames, pantryDetails);
      const backendRecipes = Array.isArray(data?.recipes) ? data.recipes : [];

      if (backendRecipes.length) {
        return {
          recipes: mapBackendRecipes(backendRecipes),
          source: data?.source || 'ai',
          note: data?.note || '',
        };
      }
    } catch (e) {
      lastError = e;
      console.warn(`getRecipeSuggestions (${apiBase}):`, e?.message || e);
    }
  }

  return {
    recipes: fallbackRecipes,
    source: 'local-fallback',
    note: lastError
      ? 'Recipe AI could not connect, so smart pantry backup recipes are shown.'
      : 'Smart pantry backup recipes are shown.',
  };
}

export async function getRecipeSuggestions(pantryItems = getPantryItems()) {
  const result = await getRecipeSuggestionResult(pantryItems);
  return result.recipes;
}

