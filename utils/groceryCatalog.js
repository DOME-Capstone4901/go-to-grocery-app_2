/** Shared grocery list for Search screen + GlobalSearchBar suggestions */
import { US_GROCERY_PRODUCTS } from '../data/usGroceryCatalog';

/** Broad US supermarket-style catalog (see `data/usGroceryCatalog.js`). */
export const GROCERY_CATALOG = US_GROCERY_PRODUCTS.map(item => ({
  id: item.id,
  name: item.name,
  category: item.category,
}));

/**
 * Ranked suggestions — works with a single letter (name, category, word-start).
 */
export function getGrocerySuggestions(raw, limit = 10) {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  const scored = [];
  for (const item of GROCERY_CATALOG) {
    const name = item.name.toLowerCase();
    const cat = item.category.toLowerCase();
    let score = 0;

    if (name === q) score += 220;
    if (name.startsWith(q)) score += 110;
    const words = name.split(/\s+/);
    if (words.some(w => w.startsWith(q))) score += 85;
    if (name.includes(q)) score += 55;

    if (cat === q) score += 70;
    if (cat.startsWith(q)) score += 50;
    if (cat.includes(q)) score += 28;

    if (score === 0 && q.length === 1) {
      if (name.includes(q)) score += 20;
    }

    if (score > 0) scored.push({ item, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score || a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' })
  );
  return scored.slice(0, limit).map(s => s.item);
}

export function filterGroceryByQuery(items, query, selectedCategory) {
  const q = query.trim().toLowerCase();
  let list = items;
  if (selectedCategory !== 'All') {
    list = list.filter(item => item.category === selectedCategory);
  }
  if (!q) return list;
  return list.filter(item => {
    const hay = `${item.name} ${item.category}`.toLowerCase();
    if (hay.includes(q)) return true;
    return item.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q));
  });
}
