import { guessCategoryForItem } from './categoryMatch';

const OPEN_FOOD_FACTS_PRODUCT_URL =
  'https://world.openfoodfacts.org/api/v2/product';

const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'generic_name_en',
  'brands',
  'categories',
  'categories_tags',
  'categories_tags_en',
  'quantity',
].join(',');

function cleanBarcode(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function firstBrand(value) {
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)[0] || '';
}

function inferCategory(product = {}) {
  const categoryText = [
    product.categories,
    ...(Array.isArray(product.categories_tags_en) ? product.categories_tags_en : []),
    ...(Array.isArray(product.categories_tags) ? product.categories_tags : []),
  ]
    .join(' ')
    .toLowerCase();

  const checks = [
    ['Eggs', ['egg']],
    ['Spices', ['spice', 'herb', 'seasoning', 'salt', 'pepper']],
    ['Condiments', ['condiment', 'sauce', 'oil', 'vinegar', 'dressing', 'spread']],
    ['Canned Goods', ['canned', 'soup', 'legume', 'bean', 'broth']],
    ['Dairy', ['dairy', 'milk', 'cheese', 'yogurt', 'cream', 'butter']],
    ['Seafood', ['seafood', 'fish', 'salmon', 'tuna', 'shrimp']],
    ['Meat', ['meat', 'poultry', 'chicken', 'beef', 'pork', 'turkey']],
    ['Bread', ['bread', 'bakery', 'bun', 'bagel', 'tortilla']],
    ['Grains', ['rice', 'pasta', 'cereal', 'grain', 'flour', 'oat']],
    ['Frozen', ['frozen']],
    ['Beverages', ['beverage', 'drink', 'juice', 'water', 'coffee', 'tea']],
    ['Snacks', ['snack', 'chip', 'cookie', 'cracker', 'dessert', 'candy']],
    ['Produce', ['fruit', 'vegetable', 'produce']],
  ];

  for (const [category, words] of checks) {
    if (words.some(word => categoryText.includes(word))) {
      return category;
    }
  }

  return '';
}

function barcodeCandidates(barcode) {
  const candidates = [barcode];
  if (barcode.length === 12) {
    candidates.push(`0${barcode}`);
  }
  if (barcode.length === 13 && barcode.startsWith('0')) {
    candidates.push(barcode.slice(1));
  }
  return [...new Set(candidates)];
}

async function fetchProduct(barcode) {
  const url =
    `${OPEN_FOOD_FACTS_PRODUCT_URL}/${encodeURIComponent(barcode)}.json` +
    `?fields=${encodeURIComponent(OPEN_FOOD_FACTS_FIELDS)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Product lookup failed (${response.status})`);
  }

  const data = await response.json();
  return data?.status === 1 && data?.product ? data.product : null;
}

export async function lookupProductByBarcode(rawBarcode) {
  const barcode = cleanBarcode(rawBarcode);
  if (barcode.length < 6) {
    return null;
  }

  let product = null;
  for (const candidate of barcodeCandidates(barcode)) {
    product = await fetchProduct(candidate);
    if (product) break;
  }

  if (!product) return null;

  const name = firstText(
    product.product_name_en,
    product.product_name,
    product.generic_name_en,
    product.generic_name
  );

  if (!name) {
    return null;
  }

  const brand = firstBrand(product.brands);
  const category = inferCategory(product) || guessCategoryForItem(name) || 'Other';

  return {
    barcode,
    name,
    brand,
    category,
    quantity: firstText(product.quantity),
  };
}
