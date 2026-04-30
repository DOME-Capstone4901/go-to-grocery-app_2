import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey)

const missingSupabaseConfigError = {
  message:
    'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to your Expo env.',
}

const fallbackSupabaseClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: missingSupabaseConfigError }),
    signUp: async () => ({ data: { user: null, session: null }, error: missingSupabaseConfigError }),
    resetPasswordForEmail: async () => ({ data: null, error: missingSupabaseConfigError }),
  },
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : fallbackSupabaseClient