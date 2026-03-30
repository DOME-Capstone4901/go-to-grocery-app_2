import { getPantryItems } from './pantryStore';
import { RECIPES } from './recipes';

export function getRecipeSuggestions() {
  const pantry = getPantryItems().map(i => i.name.toLowerCase());
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
