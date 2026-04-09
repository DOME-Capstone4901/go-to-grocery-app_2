/**
 * Demo inventory with example prices per chain (not live data — retailers have no public price API).
 * Same product list as grocery search (`data/usGroceryCatalog.js`).
 */

import { US_GROCERY_PRODUCTS } from './usGroceryCatalog';

export const STORE_BRANDS = ['walmart', 'kroger', 'aldi'];

export const DEMO_INVENTORY = US_GROCERY_PRODUCTS;

export function priceForBrand(product, brand) {
  const b = String(brand || 'walmart').toLowerCase();
  const p = product?.prices?.[b];
  if (p != null) return Number(p);
  return Number(product?.prices?.walmart ?? 0);
}

export function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

/**
 * Match a free-text grocery list line to a catalog product for demo pricing.
 * Returns null if nothing matches confidently.
 */
export function findGroceryCatalogMatch(listItemName) {
  const q = String(listItemName || '').trim().toLowerCase();
  if (q.length < 2) return null;

  let best = null;
  let bestScore = -1;

  for (const p of US_GROCERY_PRODUCTS) {
    const n = p.name.toLowerCase();
    let score = 0;

    if (n === q) {
      score = 100000;
    } else if (n.startsWith(q)) {
      score = 50000;
    } else {
      const idx = n.indexOf(q);
      if (idx >= 0) {
        score = 20000 - idx + Math.min(q.length, 40);
      } else {
        const words = q.split(/\s+/).filter(w => w.length >= 3);
        let hit = 0;
        for (const w of words) {
          if (n.includes(w)) hit += 1;
        }
        if (words.length > 0 && hit === words.length) {
          score = 8000 + hit * 100;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = p;
    } else if (score === bestScore && score > 0 && best && p.name.length < best.name.length) {
      best = p;
    }
  }

  if (bestScore < 8000) return null;
  return best;
}
