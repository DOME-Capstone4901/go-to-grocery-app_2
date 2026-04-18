import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim()

const isDev =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.NODE_ENV === 'development'

let supabaseUrl = rawUrl
let supabaseKey = rawKey

if (!supabaseUrl || !supabaseKey) {
  if (isDev) {
    // Valid URL + non-empty key so createClient can initialize when .env is missing.
    supabaseUrl = supabaseUrl ?? 'https://placeholder.supabase.co'
    supabaseKey = supabaseKey ?? 'dev-placeholder-supabase-anon-key'
    console.warn(
      '[Supabase] Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY (copy env.example to .env). Using a placeholder until then.',
    )
  } else {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. Configure them for production builds.',
    )
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})
