import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = '3000';

function cleanBase(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function isLocalAddress(value) {
  const base = cleanBase(value).toLowerCase();
  return (
    base.includes('localhost') ||
    base.includes('127.0.0.1') ||
    base.includes('0.0.0.0')
  );
}

function hostFromExpoDevServer() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;

    const withoutScheme = raw.replace(/^[a-z]+:\/\//i, '');
    const hostPort = withoutScheme.split('/')[0];
    const host = hostPort.split(':')[0];

    if (host && !isLocalAddress(host)) {
      return host;
    }
  }

  return '';
}

export function getRecipeApiBase() {
  const configured =
    typeof process !== 'undefined'
      ? cleanBase(process.env.EXPO_PUBLIC_RECIPE_API_URL)
      : '';

  if (Platform.OS !== 'web' && (!configured || isLocalAddress(configured))) {
    const devHost = hostFromExpoDevServer();
    if (devHost) {
      return `http://${devHost}:${BACKEND_PORT}`;
    }
  }

  if (configured) {
    return configured;
  }

  throw new Error(
    'Missing EXPO_PUBLIC_RECIPE_API_URL. Set it in .env.local.'
  );
}
