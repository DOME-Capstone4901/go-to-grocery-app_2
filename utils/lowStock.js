// utils/lowStock.js

const LOW_STOCK_THRESHOLDS = {
  // dairy
  gallon:  0.5,
  eggs:    4,      // store eggs with unit = 'eggs'
  sticks:  1,
  oz:      4,
  fl_oz:   4,
  cups:    1,
  

  // produce by weight
  lb:      0.5,

  // generic fallback for countable items
  count:   1,
  default: 1,
};

export function isLowStock(item) {
  const { quantity, unit, expirationDate } = item;

  // Always flag if expiring very soon and still in stock
  if (expirationDate) {
    const days = getDaysUntilExpiration(expirationDate);
    if (Number.isFinite(days) && days <= 2 && quantity > 0) return true;
  }

  const threshold = LOW_STOCK_THRESHOLDS[unit] ?? LOW_STOCK_THRESHOLDS.default;
  return quantity <= threshold;
}