import { getDaysUntilExpiration } from './expiration';
import { isLowStock } from './lowStock';

export function getPantrySuggestions(items) {
  const suggestions = [];

  items.forEach(item => {
    const days = getDaysUntilExpiration(item.expirationDate);

    // Expiring soon
    if (days >= 0 && days <= 3) {
      suggestions.push({
        type: 'expiringSoon',
        message: `${item.name} expires in ${days} days. Consider using it soon.`,
        item,
      });
    }

    // Already expired
    if (days < 0) {
      suggestions.push({
        type: 'expired',
        message: `${item.name} expired ${Math.abs(days)} days ago.`,
        item,
      });
    }

    // Low stock
    if (isLowStock(item)) {
      suggestions.push({
        type: 'lowStock',
        message: `${item.name} is running low. Add it to your grocery list?`,
        item,
      });
    }
  });

  return suggestions;
}
