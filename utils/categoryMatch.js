import { US_GROCERY_PRODUCTS } from '../data/usGroceryCatalog';

export const PANTRY_CATEGORIES = [
  'Produce',
  'Dairy',
  'Eggs',
  'Meat',
  'Seafood',
  'Spices',
  'Condiments',
  'Snacks',
  'Beverages',
  'Grains',
  'Bread',
  'Canned Goods',
  'Frozen',
  'Household',
  'Personal Care',
  'Baby',
  'Pet',
  'Other',
];

const KEYWORD_CATEGORIES = [
  ['Eggs', ['egg', 'eggs']],
  [
    'Spices',
    [
      'spice',
      'spices',
      'seasoning',
      'salt',
      'black pepper',
      'pepper grinder',
      'peppercorn',
      'garlic powder',
      'onion powder',
      'cinnamon',
      'cumin',
      'paprika',
      'oregano',
      'turmeric',
      'curry powder',
      'chili powder',
      'masala',
    ],
  ],
  [
    'Condiments',
    [
      'ketchup',
      'mustard',
      'mayonnaise',
      'mayo',
      'soy sauce',
      'hot sauce',
      'bbq sauce',
      'barbecue sauce',
      'ranch',
      'dressing',
      'olive oil',
      'vegetable oil',
      'vinegar',
      'honey',
      'syrup',
      'peanut butter',
      'jelly',
    ],
  ],
  ['Canned Goods', ['canned', 'can ', 'soup', 'beans', 'tomato paste', 'broth', 'tuna']],
  ['Dairy', ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'half & half', 'sour cream']],
  ['Seafood', ['salmon', 'fish', 'shrimp', 'tilapia', 'cod', 'tuna', 'crab']],
  ['Meat', ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'ham', 'lamb', 'hot dog']],
  ['Bread', ['bread', 'bun', 'bagel', 'tortilla', 'naan', 'roll', 'muffin', 'pita']],
  ['Grains', ['rice', 'pasta', 'oats', 'flour', 'cereal', 'spaghetti', 'macaroni', 'penne', 'noodle']],
  ['Frozen', ['frozen', 'ice cream', 'waffles', 'french fries', 'nuggets', 'tater tots']],
  ['Beverages', ['juice', 'water', 'coffee', 'tea', 'soda', 'cola', 'drink', 'lemonade']],
  ['Snacks', ['chips', 'cookie', 'cracker', 'pretzel', 'popcorn', 'candy', 'granola', 'trail mix']],
  ['Household', ['paper towel', 'toilet paper', 'trash bag', 'dish soap', 'detergent', 'cleaner', 'foil', 'wrap']],
  ['Personal Care', ['toothpaste', 'shampoo', 'conditioner', 'soap', 'body wash', 'deodorant', 'razor']],
  ['Baby', ['diaper', 'baby wipes', 'baby formula', 'baby food']],
  ['Pet', ['dog food', 'cat food', 'cat litter', 'dog treat']],
  [
    'Produce',
    [
      'apple',
      'banana',
      'orange',
      'grape',
      'berry',
      'tomato',
      'onion',
      'potato',
      'carrot',
      'broccoli',
      'lettuce',
      'bell pepper',
      'pepper',
      'avocado',
      'lemon',
      'lime',
      'mango',
      'spinach',
    ],
  ],
];

const CATALOG_CATEGORY_MAP = {
  Baby: 'Baby',
  Bakery: 'Bread',
  Beverages: 'Beverages',
  Dairy: 'Dairy',
  Deli: 'Meat',
  Frozen: 'Frozen',
  Household: 'Household',
  Meat: 'Meat',
  'Personal care': 'Personal Care',
  Pantry: 'Grains',
  Pet: 'Pet',
  Produce: 'Produce',
  Seafood: 'Seafood',
  Snacks: 'Snacks',
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function keywordCategory(value) {
  const query = normalize(value);
  for (const [category, words] of KEYWORD_CATEGORIES) {
    if (words.some(word => query.includes(word))) {
      return category;
    }
  }

  return '';
}

function findCatalogMatch(query) {
  const exact = US_GROCERY_PRODUCTS.find(
    product => normalize(product.name) === query
  );
  if (exact) {
    return exact;
  }

  const startsWith = US_GROCERY_PRODUCTS.find(product =>
    normalize(product.name).startsWith(query)
  );
  if (startsWith) {
    return startsWith;
  }

  return US_GROCERY_PRODUCTS.find(product =>
    normalize(product.name).includes(query)
  );
}

export function guessCategoryForItem(itemName) {
  const query = normalize(itemName);
  if (query.length < 2) {
    return '';
  }

  const directKeyword = keywordCategory(query);
  if (directKeyword) {
    return directKeyword;
  }

  const catalogMatch = findCatalogMatch(query);
  if (catalogMatch) {
    return (
      keywordCategory(catalogMatch.name) ||
      CATALOG_CATEGORY_MAP[catalogMatch.category] ||
      ''
    );
  }

  return '';
}
