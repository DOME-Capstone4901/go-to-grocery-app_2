# Recipe Backend

Backend service for recipe suggestions used by the grocery app.

## 1) Install

```bash
cd recipe-backend
npm install
```

## 2) Configure env

Copy `.env.example` to `.env` and add your Gemini key.

```bash
cp .env.example .env
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

## 3) Start the server

```bash
npm start
```

Server runs on `http://localhost:3000` by default.

## 4) Health check

Open:

`http://localhost:3000/health`

## 5) API endpoint

`POST /recipes/suggest`

Request body:

```json
{
  "ingredients": ["chicken", "rice", "broccoli"],
  "restrictions": ["no pork"],
  "budget": 15,
  "budgetType": "per_meal"
}
```

Response body:

```json
{
  "recipes": [
    {
      "title": "Example Recipe",
      "url": "https://example.com/recipe",
      "whyMatches": "Uses your main ingredients.",
      "missingItem": null,
      "substitution": null,
      "estimatedCost": 12.5,
      "servings": 2,
      "timeMinutes": 30,
      "ingredientsHave": ["chicken", "rice"],
      "ingredientsNeed": ["garlic"],
      "steps": ["Cook rice", "Cook chicken", "Combine and serve"]
    }
  ]
}
```
