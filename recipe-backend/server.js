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
  url.searchParams.set("components", "country:US");
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

/** Demo stores when GOOGLE_MAPS_API_KEY is not set (UI works; not real Places data). */
function mockGroceryChainsNear(lat, lng) {
  const centerLat = Number(lat);
  const centerLng = Number(lng);
  const offsets = [
    { brand: "walmart", name: "Walmart (demo — set GOOGLE_MAPS_API_KEY for live results)", dLat: 0.04, dLng: 0.02 },
    { brand: "kroger", name: "Kroger (demo)", dLat: -0.03, dLng: 0.035 },
    { brand: "aldi", name: "Aldi (demo)", dLat: 0.015, dLng: -0.04 },
  ];
  return offsets.map((o, i) => {
    const plat = centerLat + o.dLat;
    const plng = centerLng + o.dLng;
    return {
      id: `demo-${o.brand}-${i}`,
      placeId: `demo-${o.brand}-${i}`,
      brand: o.brand,
      name: o.name,
      address: "Demo pin near search area",
      lat: plat,
      lng: plng,
      miles: Math.round(distanceMiles(centerLat, centerLng, plat, plng) * 10) / 10,
    };
  });
}

async function nominatimGeocode(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", q);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "go-to-grocery-app/1.0 (recipe-backend dev)",
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => []);
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return null;
  const la = Number(hit.lat);
  const ln = Number(hit.lon);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return {
    lat: la,
    lng: ln,
    formatted: hit.display_name || q,
  };
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

const MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

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

function normalizeRecipe(recipe = {}) {
  return {
    title: String(recipe.title || "Recipe"),
    url: String(recipe.url || ""),
    whyMatches: String(recipe.whyMatches || ""),
    missingItem: recipe.missingItem ?? null,
    substitution: recipe.substitution ?? null,
    estimatedCost:
      Number.isFinite(Number(recipe.estimatedCost)) ? Number(recipe.estimatedCost) : 0,
    servings: Number.isFinite(Number(recipe.servings)) ? Number(recipe.servings) : 0,
    timeMinutes:
      Number.isFinite(Number(recipe.timeMinutes)) ? Number(recipe.timeMinutes) : 0,
    ingredientsHave: Array.isArray(recipe.ingredientsHave)
      ? recipe.ingredientsHave.map(String)
      : [],
    ingredientsNeed: Array.isArray(recipe.ingredientsNeed)
      ? recipe.ingredientsNeed.map(String)
      : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps.map(String) : [],
  };
}

function normalizeResponse(payload) {
  const recipes = Array.isArray(payload?.recipes)
    ? payload.recipes.map(normalizeRecipe).slice(0, 5)
    : [];
  return { recipes };
}

function buildPrompt({ ingredients, restrictions, budget, budgetType }) {
  const restrictionText = restrictions.length
    ? restrictions.join(", ")
    : "none";

  return `
You are a recipe assistant.

Suggest up to 5 practical recipes using these ingredients: ${ingredients.join(", ")}.

Dietary restrictions: ${restrictionText}
Budget: ${budget} (${budgetType})

Rules:
- Prefer real, common recipes.
- Include a real recipe URL from a known cooking site when possible.
- If one small ingredient is missing, set "missingItem" and "substitution".
- Keep steps concise and clear.
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
      "ingredientsHave": [],
      "ingredientsNeed": [],
      "steps": []
    }
  ]
}
`.trim();
}

async function callGemini(prompt, modelName) {
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "recipe-backend",
    port: PORT,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    googleMapsConfigured: Boolean(GOOGLE_MAPS_API_KEY),
    storeSearchMode: GOOGLE_MAPS_API_KEY ? "google_places" : "demo_pins",
  });
});

app.post("/places/grocery-stores", async (req, res) => {
  const useGoogle = Boolean(GOOGLE_MAPS_API_KEY);

  let lat = req.body?.lat;
  let lng = req.body?.lng;
  const q = String(req.body?.query || "").trim();
  let locationLabel = null;

  if ((lat == null || lng == null) && q) {
    if (useGoogle) {
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
    } else {
      try {
        const geo = await nominatimGeocode(q);
        if (!geo) {
          return res.status(400).json({
            error:
              "Could not geocode that text. Try a US ZIP or City, ST, or add GOOGLE_MAPS_API_KEY.",
          });
        }
        lat = geo.lat;
        lng = geo.lng;
        locationLabel = geo.formatted;
      } catch (e) {
        return res.status(502).json({
          error: `Geocoding failed (${e?.message || e}). Try again or use coordinates from the app.`,
        });
      }
    }
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

  if (!useGoogle) {
    const stores = mockGroceryChainsNear(latN, lngN);
    return res.json({
      lat: latN,
      lng: lngN,
      locationLabel,
      stores,
      brands: GROCERY_BRANDS.map((b) => b.id),
      demo: true,
    });
  }

  try {
    const stores = await findGroceryChains(latN, lngN, GOOGLE_MAPS_API_KEY);
    return res.json({
      lat: latN,
      lng: lngN,
      locationLabel,
      stores,
      brands: GROCERY_BRANDS.map((b) => b.id),
      demo: false,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Failed to load stores",
    });
  }
});

app.post("/recipes/suggest", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY",
    });
  }

  const ingredients = normalizeStringArray(req.body?.ingredients);
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

  const prompt = buildPrompt({ ingredients, restrictions, budget, budgetType });

  try {
    // Retry once with a fallback model for resilience.
    let result;
    try {
      result = await callGemini(prompt, MODEL);
    } catch {
      result = await callGemini(prompt, FALLBACK_MODEL);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Failed to suggest recipes",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe backend running on http://localhost:${PORT}`);
});
