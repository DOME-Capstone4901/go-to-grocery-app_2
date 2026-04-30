import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://vrpjwyvpownqibjpuxxf.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycGp3eXZwb3ducWlianB1eHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM4NzgsImV4cCI6MjA5MTMzOTg3OH0.LXHU5Q9OtZNnKjayE2RFZiunS4TxSnrvfnB0TEkS4-0'

const normalizeEnv = (value?: string) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return ''
  return trimmed
}

const supabaseUrl =
  normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL
const supabaseKey =
  normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_KEY) || DEFAULT_SUPABASE_ANON_KEY
const hasValidSupabaseEnv = supabaseUrl.startsWith('http') && supabaseKey.length > 0

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

const createSupabaseClient = () => {
  if (!hasValidSupabaseEnv) return fallbackSupabaseClient

  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  } catch (error) {
    console.warn('[supabase] Falling back to no-op client:', error)
    return fallbackSupabaseClient
  }
}

export const supabase = createSupabaseClient()