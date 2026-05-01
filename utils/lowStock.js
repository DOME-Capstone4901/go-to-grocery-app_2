import { getDaysUntilExpiration } from './expiration';

const LOW_STOCK_THRESHOLDS = {
  gallon: 0.5,
  eggs: 4,
  sticks: 1,
  oz: 4,
  fl_oz: 4,
  cups: 1,
  lb: 0.5,
  count: 1,
  default: 1,
};

export function isLowStock(item = {}) {
  const quantity = Number(item.quantity);
  const unit = String(item.unit || 'count').toLowerCase();

  if (item.expirationDate) {
    const days = getDaysUntilExpiration(item.expirationDate);
    if (Number.isFinite(days) && days <= 2 && quantity > 0) {
      return true;
    }
  }

  const threshold = LOW_STOCK_THRESHOLDS[unit] ?? LOW_STOCK_THRESHOLDS.default;
  return Number.isFinite(quantity) && quantity <= threshold;
}
