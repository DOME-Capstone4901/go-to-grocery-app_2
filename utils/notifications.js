import * as Notifications from 'expo-notifications';
import { getPantryItems } from './pantryStore';
import { getDaysUntilExpiration } from './expiration';

export async function scheduleExpirationAlerts() {
  const items = getPantryItems();

  for (const item of items) {
    const days = getDaysUntilExpiration(item.expirationDate);

    if (days === 1) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Item expiring soon',
          body: `${item.name} expires tomorrow`,
        },
        trigger: { seconds: 5 },
      });
    }
  }
}
