import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatExpirationDate, getDaysUntilExpiration, parseExpirationDate } from './expiration';
import { getPantryItems } from './pantryStore';

const NOTIFICATION_KEY = 'expiration_notification_ids_v1';
let permissionsRequested = false;
const canScheduleNotifications =
  Platform.OS !== 'web' &&
  typeof Notifications.scheduleNotificationAsync === 'function' &&
  typeof Notifications.cancelScheduledNotificationAsync === 'function' &&
  typeof Notifications.getPermissionsAsync === 'function' &&
  typeof Notifications.requestPermissionsAsync === 'function';

async function ensureNotificationPermissions() {
  if (!canScheduleNotifications) {
    return false;
  }

  if (permissionsRequested) {
    return true;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    permissionsRequested = true;
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  permissionsRequested = requested.granted;
  return requested.granted;
}

async function getNotificationMap() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveNotificationMap(map) {
  await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(map));
}

function getAlertDate(expirationDate) {
  const expiration = parseExpirationDate(expirationDate);

  if (!expiration) {
    return null;
  }

  expiration.setHours(9, 0, 0, 0);

  const alertDate = new Date(expiration);
  alertDate.setDate(alertDate.getDate() - 1);

  const now = new Date();

  if (expiration <= now) {
    return null;
  }

  if (alertDate <= now) {
    const soon = new Date(now.getTime() + 60 * 1000);
    return soon < expiration ? soon : null;
  }

  return alertDate;
}

function getNotificationItemKey(item) {
  return item.id || `${item.name}:${formatExpirationDate(item.expirationDate)}`;
}

export async function scheduleItemExpirationAlert(item) {
  if (!canScheduleNotifications) {
    return;
  }

  if (!item?.name || !item?.expirationDate) {
    return;
  }

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  const alertDate = getAlertDate(item.expirationDate);
  if (!alertDate) {
    return;
  }

  const map = await getNotificationMap();
  const itemKey = getNotificationItemKey(item);
  const existingId = map[itemKey];

  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Item expiring soon',
      body: `${item.name} expires on ${formatExpirationDate(item.expirationDate)}`,
    },
    trigger: alertDate,
  });

  map[itemKey] = notificationId;
  await saveNotificationMap(map);
}

export async function scheduleExpirationAlerts() {
  if (!canScheduleNotifications) {
    return;
  }

  const items = getPantryItems();
  const validKeys = new Set();

  for (const item of items) {
    const days = getDaysUntilExpiration(item.expirationDate);

    if (Number.isFinite(days) && days >= 0) {
      const itemKey = getNotificationItemKey(item);
      validKeys.add(itemKey);
      await scheduleItemExpirationAlert(item);
    }
  }

  const map = await getNotificationMap();
  let changed = false;

  for (const [itemKey, notificationId] of Object.entries(map)) {
    if (!validKeys.has(itemKey)) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      delete map[itemKey];
      changed = true;
    }
  }

  if (changed) {
    await saveNotificationMap(map);
  }
}
