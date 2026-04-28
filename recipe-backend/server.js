import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "1mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PORT = Number(process.env.PORT) || 3000;

const GROCERY_BRANDS = [
  {
    id: "walmart",
    keyword: "Walmart",
    match: (name) => /walmart/i.test(name),
  },
  {
    id: "kroger",
    keyword: "Kroger",
    match: (name) => /kroger/i.test(name),
  },
  {
    id: "aldi",
    keyword: "Aldi",
    match: (name) => /aldi/i.test(name),
  },
];

function deg2rad(n) {
  return (n * Math.PI) / 180;
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function googleGeocode(address, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (data.status !== "OK" || !data.results?.[0]) {
    return null;
  }
  const loc = data.results[0].geometry.location;
  return {
    lat: loc.lat,
    lng: loc.lng,
    formatted: data.results[0].formatted_address,
  };
}

async function googleNearbySearch(lat, lng, keyword, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "35000");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (data.status === "ZERO_RESULTS") {
    return [];
  }
  if (data.status !== "OK") {
    const msg = data.error_message || data.status || "Nearby search failed";
    throw new Error(msg);
  }
  return Array.isArray(data.results) ? data.results : [];
}

async function findGroceryChains(lat, lng, apiKey) {
  const centerLat = Number(lat);
  const centerLng = Number(lng);
  const seen = new Set();
  const out = [];

  for (const brand of GROCERY_BRANDS) {
    let results = [];
    try {
      results = await googleNearbySearch(centerLat, centerLng, brand.keyword, apiKey);
    } catch (e) {
      console.warn(`Nearby ${brand.keyword}:`, e?.message || e);
      continue;
    }

    for (const p of results) {
      const name = p.name || "";
      if (!brand.match(name)) continue;
      const pid = p.place_id;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      const plat = p.geometry?.location?.lat;
      const plng = p.geometry?.location?.lng;
      if (plat == null || plng == null) continue;
      out.push({
        id: pid,
        placeId: pid,
        brand: brand.id,
        name,
        address: p.vicinity || p.formatted_address || "",
        lat: plat,
        lng: plng,
        miles:
          Math.round(distanceMiles(centerLat, centerLng, plat, plng) * 10) / 10,
      });
    }
  }

  out.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
  return out;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function normalizeBudget(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePantryDetails(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: String(item?.name || "").trim(),
      category: String(item?.category || "").trim(),
      quantity:
        Number.isFinite(Number(item?.quantity)) && Number(item.quantity) > 0
          ? Number(item.quantity)
          : null,
      expirationDate: String(item?.expirationDate || "").trim(),
      daysUntilExpiration:
        Number.isFinite(Number(item?.daysUntilExpiration))
          ? Number(item.daysUntilExpiration)
          : null,
    }))
    .filter((item) => item.name)
    .slice(0, 30);
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  const maybeJson = text.slice(start, end + 1);
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function recipeItemName(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(recipeItemName).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return recipeItemName(
      value.name ||
        value.item ||
        value.ingredient ||
        value.productName ||
        value.title ||
        value.label ||
        value.value
    );
  }
  return "";
}

function recipeItemList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(recipeItemName).filter(Boolean);
}

function normalizeRecipe(recipe = {}) {
  return {
    title: recipeItemName(recipe.title) || "Recipe",
    url: recipeItemName(recipe.url),
    whyMatches: recipeItemName(recipe.whyMatches),
    missingItem: recipeItemName(recipe.missingItem) || null,
    substitution: recipeItemName(recipe.substitution) || null,
    estimatedCost:
      Number.isFinite(Number(recipe.estimatedCost)) ? Number(recipe.estimatedCost) : 0,
    servings: Number.isFinite(Number(recipe.servings)) ? Number(recipe.servings) : 0,
    timeMinutes:
      Number.isFinite(Number(recipe.timeMinutes)) ? Number(recipe.timeMinutes) : 0,
    cuisine: recipeItemName(recipe.cuisine),
    difficulty: recipeItemName(recipe.difficulty),
    ingredientsHave: recipeItemList(recipe.ingredientsHave),
    ingredientsNeed: recipeItemList(recipe.ingredientsNeed),
    steps: recipeItemList(recipe.steps).slice(0, 6),
  };
}

function normalizeResponse(payload) {
  const seen = new Set();
  const recipes = [];
  const rawRecipes = Array.isArray(payload?.recipes) ? payload.recipes : [];

  for (const rawRecipe of rawRecipes) {
    const recipe = normalizeRecipe(rawRecipe);
    const key = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    recipes.push(recipe);
    if (recipes.length >= 5) break;
  }

  return { recipes };
}

function uniqueNames(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const name = String(value || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }

  return out;
}

function recipeTitleBase(ingredients) {
  if (ingredients.length >= 2) {
    return `${ingredients[0]} and ${ingredients[1]}`;
  }
  return ingredients[0] || "Pantry";
}

function missingItemsForRecipe(ingredients, candidates) {
  const pantryKeys = new Set(ingredients.map((name) => name.toLowerCase()));
  return candidates.filter((item) => !pantryKeys.has(item.toLowerCase())).slice(0, 2);
}

function makeFallbackRecipes(ingredients, pantryDetails) {
  const pantryNames = uniqueNames([
    ...pantryDetails.map((item) => item.name),
    ...ingredients,
  ]);
  const expiringNames = pantryDetails
    .filter(
      (item) =>
        Number.isFinite(Number(item.daysUntilExpiration)) &&
        Number(item.daysUntilExpiration) <= 5
    )
    .sort((a, b) => Number(a.daysUntilExpiration) - Number(b.daysUntilExpiration))
    .map((item) => item.name);
  const focus = uniqueNames([...expiringNames, ...pantryNames]).slice(0, 4);
  const titleBase = recipeTitleBase(focus.length ? focus : pantryNames);
  const have = focus.length ? focus : pantryNames.slice(0, 4);

  const templates = [
    {
      title: `Quick ${titleBase} Skillet`,
      cuisine: "American/Home-style",
      difficulty: "Easy",
      timeMinutes: 20,
      servings: 2,
      estimatedCost: 4,
      missingCandidates: ["onion", "cheese"],
      steps: [
        "Chop the pantry ingredients into bite-size pieces.",
        "Warm a pan and cook the firm ingredients first.",
        "Add the remaining pantry items and stir until hot.",
        "Season to taste and serve warm.",
      ],
    },
    {
      title: `Indian-Style ${titleBase} Bowl`,
      cuisine: "Indian",
      difficulty: "Easy",
      timeMinutes: 25,
      servings: 2,
      estimatedCost: 5,
      missingCandidates: ["curry powder", "ginger"],
      steps: [
        "Cook or warm the pantry base ingredient.",
        "Simmer the remaining ingredients with a small splash of water or milk if available.",
        "Add curry-style seasoning and cook until everything is tender.",
        "Serve together in a bowl.",
      ],
    },
    {
      title: `Mediterranean ${titleBase} Plate`,
      cuisine: "Mediterranean",
      difficulty: "Easy",
      timeMinutes: 18,
      servings: 2,
      estimatedCost: 5,
      missingCandidates: ["lemon", "feta cheese"],
      steps: [
        "Prepare the pantry ingredients by slicing or warming them.",
        "Arrange them together as a bowl or plate.",
        "Add a bright topping if available.",
        "Serve as a quick lunch or light dinner.",
      ],
    },
    {
      title: `Mexican Pantry ${titleBase} Bowl`,
      cuisine: "Mexican",
      difficulty: "Easy",
      timeMinutes: 22,
      servings: 2,
      estimatedCost: 5,
      missingCandidates: ["tortilla", "salsa"],
      steps: [
        "Warm the pantry ingredients together in a pan.",
        "Build a bowl or wrap with the cooked ingredients.",
        "Add salsa or a simple topping if available.",
        "Serve while warm.",
      ],
    },
    {
      title: `Italian-Inspired ${titleBase}`,
      cuisine: "Italian",
      difficulty: "Easy",
      timeMinutes: 25,
      servings: 2,
      estimatedCost: 6,
      missingCandidates: ["garlic", "parmesan cheese"],
      steps: [
        "Cook the pantry ingredients until warm and tender.",
        "Add a simple sauce or a little liquid to bring it together.",
        "Simmer briefly so the flavors combine.",
        "Finish with cheese or herbs if available.",
      ],
    },
  ];

  return normalizeResponse({
    recipes: templates.map((template) => {
      const ingredientsNeed = missingItemsForRecipe(pantryNames, template.missingCandidates);
      return {
        title: template.title,
        url: "",
        whyMatches: expiringNames.length
          ? `Uses pantry items, especially ${expiringNames[0]}, before it expires.`
          : "Uses ingredients already in your pantry for a quick meal idea.",
        missingItem: ingredientsNeed[0] || null,
        substitution: ingredientsNeed[0]
          ? `If you do not have ${ingredientsNeed[0]}, use a similar pantry item.`
          : null,
        estimatedCost: template.estimatedCost,
        servings: template.servings,
        timeMinutes: template.timeMinutes,
        cuisine: template.cuisine,
        difficulty: template.difficulty,
        ingredientsHave: have,
        ingredientsNeed,
        steps: template.steps,
      };
    }),
  });
}

function buildPrompt({ ingredients, pantryDetails, restrictions, budget, budgetType }) {
  const restrictionText = restrictions.length
    ? restrictions.join(", ")
    : "none";
  const pantryText = pantryDetails.length
    ? pantryDetails
        .map((item) => {
          const parts = [item.name];
          if (item.category) parts.push(`category: ${item.category}`);
          if (item.quantity != null) parts.push(`qty: ${item.quantity}`);
          if (item.expirationDate) parts.push(`expires: ${item.expirationDate}`);
          if (item.daysUntilExpiration != null) {
            parts.push(`days left: ${item.daysUntilExpiration}`);
          }
          return `- ${parts.join(", ")}`;
        })
        .join("\n")
    : ingredients.map((name) => `- ${name}`).join("\n");

  return `
You are a recipe assistant.

Suggest 5 practical pantry-based recipes.

Pantry items:
${pantryText}

Dietary restrictions: ${restrictionText}
Budget: ${budget} (${budgetType})

Rules:
- Use pantry ingredients as the main source. Prioritize items expiring soon.
- Return a varied mix, not five versions of the same meal.
- Include different cuisines when possible: American/home-style, Mediterranean, Mexican, Italian, Indian, and at most one Asian-style recipe.
- Keep recipes realistic for a college student or busy household.
- Missing ingredients should be common grocery items, no more than 2 per recipe.
- Do not list salt, pepper, water, or oil as missing ingredients unless truly essential.
- "ingredientsHave" must only include pantry items that are actually used in that recipe.
- "ingredientsNeed" must only include items not already in the pantry.
- "whyMatches" should explain why this recipe fits the pantry in one short sentence.
- The "url" field may be empty. Do not invent exact recipe page URLs.
- If one small ingredient is missing, set "missingItem" and "substitution".
- Keep steps concise and clear, 4 to 6 steps.
- Return only JSON.

Return this exact shape:
{
  "recipes": [
    {
      "title": "",
      "url": "",
      "whyMatches": "",
      "missingItem": null,
      "substitution": null,
      "estimatedCost": 0,
      "servings": 0,
      "timeMinutes": 0,
      "cuisine": "",
      "difficulty": "",
      "ingredientsHave": [],
      "ingredientsNeed": [],
      "steps": []
    }
  ]
}
`.trim();
}

async function callGemini(prompt, modelName) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
      },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || `Gemini request failed (${response.status})`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error("Model returned invalid JSON");
  return normalizeResponse(parsed);
}

function isGoogleNetworkError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("enotfound") ||
    msg.includes("getaddrinfo") ||
    msg.includes("econnrefused") ||
    msg.includes("network") ||
    msg.includes("failed to fetch")
  );
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "recipe-backend",
    port: PORT,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    googleMapsConfigured: Boolean(GOOGLE_MAPS_API_KEY),
    storeSearchMode: "google_places",
  });
});

app.post("/places/grocery-stores", async (req, res) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GOOGLE_MAPS_API_KEY",
    });
  }

  let lat = req.body?.lat;
  let lng = req.body?.lng;
  const q = String(req.body?.query || "").trim();
  let locationLabel = null;

  if ((lat == null || lng == null) && q) {
    const geo = await googleGeocode(q, GOOGLE_MAPS_API_KEY);
    if (!geo) {
      return res.status(400).json({
        error:
          "Could not resolve that location. Try a US ZIP (5 digits), or City, ST (e.g. Austin, TX).",
      });
    }
    lat = geo.lat;
    lng = geo.lng;
    locationLabel = geo.formatted;
  }

  if (
    lat == null ||
    lng == null ||
    Number.isNaN(Number(lat)) ||
    Number.isNaN(Number(lng))
  ) {
    return res.status(400).json({
      error: "Provide lat/lng or a query to geocode.",
    });
  }

  const latN = Number(lat);
  const lngN = Number(lng);

  try {
    const stores = await findGroceryChains(latN, lngN, GOOGLE_MAPS_API_KEY);
    return res.json({
      lat: latN,
      lng: lngN,
      locationLabel,
      stores,
      brands: GROCERY_BRANDS.map((b) => b.id),
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Failed to load stores",
    });
  }
});

app.post("/recipes/suggest", async (req, res) => {
  const ingredients = normalizeStringArray(req.body?.ingredients);
  const pantryDetails = normalizePantryDetails(req.body?.pantryItems);
  const restrictions = normalizeStringArray(req.body?.restrictions);
  const budget = normalizeBudget(req.body?.budget);
  const budgetType =
    req.body?.budgetType === "per_week" ? "per_week" : "per_meal";

  if (!ingredients.length) {
    return res.status(400).json({
      error: "ingredients must contain at least one item",
    });
  }

  if (!budget) {
    return res.status(400).json({
      error: "budget must be a number greater than 0",
    });
  }

  if (!GEMINI_API_KEY) {
    return res.json({
      ...makeFallbackRecipes(ingredients, pantryDetails),
      source: "local-fallback",
      note: "Recipe AI key is not configured, so local pantry suggestions were used.",
    });
  }

  const prompt = buildPrompt({
    ingredients,
    pantryDetails,
    restrictions,
    budget,
    budgetType,
  });

  try {
    let result;
    try {
      result = await callGemini(prompt, MODEL);
    } catch (primaryError) {
      if (!FALLBACK_MODEL || isGoogleNetworkError(primaryError)) {
        throw primaryError;
      }
      result = await callGemini(prompt, FALLBACK_MODEL);
    }
    return res.json(result);
  } catch (err) {
    console.warn("Recipe AI unavailable; using local fallback:", err?.message || err);
    return res.json({
      ...makeFallbackRecipes(ingredients, pantryDetails),
      source: "local-fallback",
      note: "Recipe AI is temporarily unavailable, so local pantry suggestions were used.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe backend running on http://localhost:${PORT}`);
});
