import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post("/recipes/suggest", async (req, res) => {

  const { ingredients, restrictions, budget } = req.body;

  try {

    const prompt = `
You are a recipe assistant.

Suggest 5 recipes using these ingredients: ${ingredients.join(", ")}

Diet restrictions: ${restrictions.join(", ")}

Budget: ${budget}

Return ONLY valid JSON in this format:

{
 "recipes":[
  {
   "title":"",
   "url": "Return a real working recipe URL from a known cooking website. Never return N/A.",
   "whyMatches":"",
   "missingItem":null,
   "substitution":null,
   "estimatedCost":0,
   "servings":0,
   "timeMinutes":0,
   "ingredientsHave":[],
   "ingredientsNeed":[],
   "steps":[]
  }
 ]
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("Full Gemini response:", JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini raw response:", text);

    let parsed;

    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON found in Gemini response");
      }

      const jsonString = text.slice(jsonStart, jsonEnd);
      parsed = JSON.parse(jsonString);

    } catch (parseErr) {
      console.error("JSON parse failed:", parseErr);

      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: text
      });
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});