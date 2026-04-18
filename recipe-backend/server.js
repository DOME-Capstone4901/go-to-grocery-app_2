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

/** Strip leading chain name so "Walmart 97146" / "Kroger 30309" / "Aldi Portland, OR" geocode correctly. */
const CHAIN_ONLY = /^\s*(walmart|kroger|aldi)\s*$/i;

function stripLeadingChainQuery(raw) {
  const t = String(raw || "").trim();
  if (CHAIN_ONLY.test(t)) return "";
  const m = t.match(/^\s*(walmart|kroger|aldi)\s+(.+)$/i);
  return m ? m[2].trim() : t;
}

const OVERPASS_INTERPRETER = "https://overpass-api.de/api/interpreter";

/**
 * Free store POIs via OpenStreetMap Overpass API (no Google key).
 * Walmart, Kroger, and Aldi: brand / operator / brand:wikidata / shop+name fallbacks (US coverage varies).
 */
async function overpassGroceryChainsNear(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  const r = 25000;
  const q = `
[out:json][timeout:60];
(
  nwr["brand"="Walmart"](around:${r},${la},${ln});
  nwr["brand"="Kroger"](around:${r},${la},${ln});
  nwr["brand"="Aldi"](around:${r},${la},${ln});
  nwr["brand"="ALDI"](around:${r},${la},${ln});
  nwr["operator"="Kroger"](around:${r},${la},${ln});
  nwr["operator"="Aldi"](around:${r},${la},${ln});
  nwr["operator"="ALDI"](around:${r},${la},${ln});
  nwr["brand:wikidata"="Q483551"](around:${r},${la},${ln});
  nwr["brand:wikidata"="Q125967"](around:${r},${la},${ln});
  nwr["brand:wikidata"="Q496807"](around:${r},${la},${ln});
  nwr["brand:wikidata"="Q1530382"](around:${r},${la},${ln});
  nwr["shop"="supermarket"]["name"~"Walmart",i](around:${r},${la},${ln});
  nwr["shop"="supermarket"]["name"~"Kroger",i](around:${r},${la},${ln});
  nwr["shop"="supermarket"]["name"~"Aldi",i](around:${r},${la},${ln});
  nwr["shop"="department_store"]["name"~"Walmart",i](around:${r},${la},${ln});
  nwr["shop"="department_store"]["name"~"Kroger",i](around:${r},${la},${ln});
  nwr["shop"="discount_supermarket"]["name"~"Aldi",i](around:${r},${la},${ln});
);
out center;
`.trim();

  const response = await fetch(OVERPASS_INTERPRETER, {
    method: "POST",
    body: q,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "User-Agent": "go-to-grocery-app/1.0 (recipe-backend; OSM Overpass)",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.remark || `Overpass HTTP ${response.status}`);
  }

  return normalizeOverpassElements(data, la, ln);
}

function classifyOsmGroceryBrand(name, tags) {
  const tagsBrand = String(tags?.brand || "");
  const b = tagsBrand.toLowerCase();
  const n = String(name || "").toLowerCase();
  const op = String(tags?.operator || "").toLowerCase();
  const wd = String(tags["brand:wikidata"] || "");

  // Common Wikidata IDs for chain stores in OSM
  if (wd === "Q483551") return "walmart";
  if (wd === "Q125967" || wd === "Q496807") return "aldi";
  if (wd === "Q1530382" || wd === "Q1193285") return "kroger";

  if (b.includes("walmart") || /\bwalmart\b/.test(n)) return "walmart";
  if (b.includes("kroger") || op.includes("kroger") || /\bkroger\b/.test(n)) return "kroger";
  if (
    b.includes("aldi") ||
    op.includes("aldi") ||
    /\baldi\b/.test(n) ||
    /^aldi\s/i.test(String(name || "").trim())
  ) {
    return "aldi";
  }
  return null;
}

function formatOsmAddress(tags) {
  if (!tags || typeof tags !== "object") return "";
  const line1 = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const line2 = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(", ");
  const parts = [line1, line2].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return String(tags["addr:full"] || "").trim();
}

function normalizeOverpassElements(data, centerLat, centerLng) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const seen = new Set();
  const out = [];

  for (const el of elements) {
    let plat;
    let plng;
    if (el.type === "node") {
      plat = el.lat;
      plng = el.lon;
    } else if (el.center) {
      plat = el.center.lat;
      plng = el.center.lon;
    } else {
      continue;
    }
    if (!Number.isFinite(plat) || !Number.isFinite(plng)) continue;

    const tags = el.tags || {};
    const name = tags.name || tags.brand || "Store";
    const brand = classifyOsmGroceryBrand(name, tags);
    if (!brand) continue;

    const uid = `${el.type}-${el.id}`;
    if (seen.has(uid)) continue;
    seen.add(uid);

    const address = formatOsmAddress(tags);
    out.push({
      id: `osm-${uid}`,
      placeId: `osm-${uid}`,
      brand,
      name: String(name).slice(0, 200),
      address: address || "Address from OpenStreetMap",
      lat: plat,
      lng: plng,
      miles: Math.round(distanceMiles(centerLat, centerLng, plat, plng) * 10) / 10,
    });
  }

  out.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
  return out.slice(0, 80);
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

/** US location autocomplete for the store finder (Nominatim — max ~1 req/s; client debounces). */
async function nominatimSearchSuggest(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "0");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "go-to-grocery-app/1.0 (recipe-backend; geocode-suggest)",
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data
    .map((hit, i) => {
      const la = Number(hit.lat);
      const ln = Number(hit.lon);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
      const id = hit.place_id != null ? `n${hit.place_id}` : `nom-${i}-${la}-${ln}`;
      return {
        id,
        label: String(hit.display_name || "").slice(0, 200),
        lat: la,
        lng: ln,
      };
    })
    .filter(Boolean);
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Nominatim reverse — no API key. */
async function nominatimReverseGeo(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(la));
  url.searchParams.set("lon", String(ln));
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "go-to-grocery-app/1.0 (recipe-backend; reverse-geocode)",
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!data || data.error) return null;
  const addr = data.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.county ||
    "";
  const locality =
    addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || "";
  const line1 = [addr.house_number, addr.road].filter(Boolean).join(" ").trim();
  return {
    latitude: la,
    longitude: ln,
    formattedAddress: String(data.display_name || "").slice(0, 500),
    country: String(addr.country || ""),
    countryCode: String(addr.country_code || "").toUpperCase(),
    city: String(city),
    locality: String(locality),
    state: String(addr.state || ""),
    postalCode: String(addr.postcode || ""),
    streetLine: line1,
    raw: addr,
  };
}

function googlePlacesTypeCategory(types) {
  const t = Array.isArray(types) ? types : [];
  if (t.includes("supermarket")) return "Supermarket";
  if (t.includes("grocery_or_supermarket")) return "Grocery / supermarket";
  if (t.includes("convenience_store")) return "Convenience store";
  if (t.includes("store")) return "Store";
  if (t.includes("food")) return "Food retail";
  return "Grocery / retail";
}

async function googlePlacesBroadFoodRetail(lat, lng, radiusM, apiKey) {
  const la = Number(lat);
  const ln = Number(lng);
  const r = Math.min(Math.max(Number(radiusM) || 3000, 100), 50000);
  const types = ["grocery_or_supermarket", "supermarket", "convenience_store"];
  const seen = new Set();
  const out = [];

  for (const typ of types) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${la},${ln}`);
    url.searchParams.set("radius", String(r));
    url.searchParams.set("type", typ);
    url.searchParams.set("key", apiKey);
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      const msg = data.error_message || data.status || "Nearby search failed";
      if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
        throw new Error(msg);
      }
      continue;
    }
    for (const p of data.results || []) {
      const pid = p.place_id;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      const plat = p.geometry?.location?.lat;
      const plng = p.geometry?.location?.lng;
      if (plat == null || plng == null) continue;
      const dKm = distanceKm(la, ln, plat, plng);
      if (dKm * 1000 > r * 1.05) continue;
      out.push({
        id: pid,
        placeId: pid,
        name: String(p.name || "Store").slice(0, 200),
        address: String(p.vicinity || p.formatted_address || "").slice(0, 300),
        lat: plat,
        lng: plng,
        category: googlePlacesTypeCategory(p.types),
        distanceKm: Math.round(dKm * 1000) / 1000,
      });
    }
  }

  out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return out.slice(0, 100);
}

function osmShopCategory(tags) {
  const s = String(tags?.shop || "").toLowerCase();
  if (s === "supermarket") return "Supermarket";
  if (s === "convenience") return "Convenience store";
  if (s === "general") return "General store";
  if (s === "department_store") return "Department store";
  if (s === "mall") return "Mall / retail";
  if (s === "yes") return "Shop (unspecified)";
  return "Grocery / retail";
}

function normalizeBroadOverpassElements(data, centerLat, centerLng, maxRadiusKm) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const seen = new Set();
  const out = [];

  for (const el of elements) {
    let plat;
    let plng;
    if (el.type === "node") {
      plat = el.lat;
      plng = el.lon;
    } else if (el.center) {
      plat = el.center.lat;
      plng = el.center.lon;
    } else {
      continue;
    }
    if (!Number.isFinite(plat) || !Number.isFinite(plng)) continue;

    const tags = el.tags || {};
    const name = tags.name || tags.brand || tags.operator;
    if (!name) continue;

    const uid = `${el.type}-${el.id}`;
    if (seen.has(uid)) continue;
    seen.add(uid);

    const dKm = distanceKm(centerLat, centerLng, plat, plng);
    if (dKm > maxRadiusKm * 1.05) continue;

    out.push({
      id: `osm-retail-${uid}`,
      placeId: `osm-retail-${uid}`,
      name: String(name).slice(0, 200),
      address: formatOsmAddress(tags) || "Address from OpenStreetMap",
      lat: plat,
      lng: plng,
      category: osmShopCategory(tags),
      distanceKm: Math.round(dKm * 1000) / 1000,
    });
  }

  out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return out.slice(0, 100);
}

async function overpassBroadFoodRetail(lat, lng, radiusM) {
  const la = Number(lat);
  const ln = Number(lng);
  const r = Math.min(Math.max(Number(radiusM) || 3000, 100), 25000);
  const q = `
[out:json][timeout:75];
(
  nwr["shop"="supermarket"](around:${r},${la},${ln});
  nwr["shop"="convenience"](around:${r},${la},${ln});
  nwr["shop"="general"](around:${r},${la},${ln});
  nwr["shop"="department_store"](around:${r},${la},${ln});
);
out center;
`.trim();

  const response = await fetch(OVERPASS_INTERPRETER, {
    method: "POST",
    body: q,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "User-Agent": "go-to-grocery-app/1.0 (recipe-backend; broad-retail)",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.remark || `Overpass HTTP ${response.status}`);
  }

  const maxKm = r / 1000;
  return normalizeBroadOverpassElements(data, la, ln, maxKm);
}

function mockBroadStoresNear(lat, lng, radiusKm) {
  const la = Number(lat);
  const ln = Number(lng);
  const rKm = Math.min(Math.max(Number(radiusKm) || 3, 0.5), 50);
  const labels = [
    ["Neighborhood Market", "Supermarket"],
    ["Quick Stop Mart", "Convenience store"],
    ["Fresh Foods Co-op", "Grocery / supermarket"],
    ["City Grocer", "Supermarket"],
    ["Express Mini Mart", "Convenience store"],
    ["Organic Pantry", "Grocery / retail"],
    ["Family Dollar Foods", "General store"],
    ["Main Street Foods", "Supermarket"],
  ];
  const out = [];
  for (let i = 0; i < labels.length; i += 1) {
    const angle = (i / labels.length) * Math.PI * 2;
    const frac = 0.25 + (i % 4) * 0.15;
    const dk = rKm * frac;
    const dLat = (dk / 111) * Math.sin(angle);
    const dLng = (dk / (111 * Math.cos(deg2rad(la)))) * Math.cos(angle);
    const plat = la + dLat;
    const plng = ln + dLng;
    out.push({
      id: `mock-retail-${i}`,
      placeId: `mock-retail-${i}`,
      name: labels[i][0],
      address: `${100 + i * 17} Demo Rd (mock data)`,
      lat: plat,
      lng: plng,
      category: labels[i][1],
      distanceKm: Math.round(distanceKm(la, ln, plat, plng) * 1000) / 1000,
    });
  }
  return out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
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
    storeSearchMode: GOOGLE_MAPS_API_KEY ? "google_places" : "osm_overpass",
  });
});

app.get("/places/geocode-suggest", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ suggestions: [] });
  }
  try {
    const suggestions = await nominatimSearchSuggest(q);
    return res.json({ suggestions });
  } catch (e) {
    return res.status(502).json({
      suggestions: [],
      error: e?.message || String(e),
    });
  }
});

app.post("/places/grocery-stores", async (req, res) => {
  const useGoogle = Boolean(GOOGLE_MAPS_API_KEY);

  let lat = req.body?.lat;
  let lng = req.body?.lng;
  const qRaw = String(req.body?.query || "").trim();
  const q = stripLeadingChainQuery(qRaw);
  let locationLabel = null;

  if ((lat == null || lng == null) && !q && qRaw && CHAIN_ONLY.test(qRaw)) {
    return res.status(400).json({
      error:
        'Add a ZIP or city after the store name (e.g. "Walmart 97201", "Kroger 30309", "Aldi Portland, OR"), or clear the field to search near your location.',
    });
  }

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
    try {
      const stores = await overpassGroceryChainsNear(latN, lngN);
      if (stores.length) {
        return res.json({
          lat: latN,
          lng: lngN,
          locationLabel,
          stores,
          brands: GROCERY_BRANDS.map((b) => b.id),
          demo: false,
          source: "osm_overpass",
        });
      }
    } catch (e) {
      console.warn("Overpass grocery search:", e?.message || e);
    }
    const stores = mockGroceryChainsNear(latN, lngN);
    return res.json({
      lat: latN,
      lng: lngN,
      locationLabel,
      stores,
      brands: GROCERY_BRANDS.map((b) => b.id),
      demo: true,
      source: "demo_fallback",
      overpassError: "No OSM results or Overpass unavailable — showing demo pins.",
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

app.post("/places/reverse-geocode", async (req, res) => {
  const lat = req.body?.lat;
  const lng = req.body?.lng;
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return res.status(400).json({ error: "Provide lat and lng in the JSON body." });
  }
  try {
    const result = await nominatimReverseGeo(lat, lng);
    if (!result) {
      return res.status(502).json({ error: "Reverse geocoding returned no result." });
    }
    return res.json(result);
  } catch (e) {
    return res.status(502).json({ error: e?.message || String(e) });
  }
});

app.post("/places/nearby-food-retail", async (req, res) => {
  const lat = req.body?.lat;
  const lng = req.body?.lng;
  let radiusMeters = Number(req.body?.radiusMeters);
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return res.status(400).json({ error: "Provide lat and lng." });
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    radiusMeters = 3000;
  }
  radiusMeters = Math.min(Math.max(Math.round(radiusMeters), 100), 50000);

  const la = Number(lat);
  const ln = Number(lng);
  const useGoogle = Boolean(GOOGLE_MAPS_API_KEY);

  if (useGoogle) {
    try {
      const stores = await googlePlacesBroadFoodRetail(la, ln, radiusMeters, GOOGLE_MAPS_API_KEY);
      return res.json({
        lat: la,
        lng: ln,
        radiusMeters,
        stores,
        source: "google_places",
        demo: false,
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Nearby search failed" });
    }
  }

  try {
    const stores = await overpassBroadFoodRetail(la, ln, radiusMeters);
    if (stores.length) {
      return res.json({
        lat: la,
        lng: ln,
        radiusMeters,
        stores,
        source: "osm_overpass",
        demo: false,
      });
    }
  } catch (e) {
    console.warn("Broad Overpass retail:", e?.message || e);
  }

  const radiusKm = radiusMeters / 1000;
  const stores = mockBroadStoresNear(la, ln, radiusKm);
  return res.json({
    lat: la,
    lng: ln,
    radiusMeters,
    stores,
    source: "mock_fallback",
    demo: true,
    note: "No OSM results or API unavailable — mock stores around this point.",
  });
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
