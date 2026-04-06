import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT) || 3000;

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
