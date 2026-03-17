import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Check if we're in development/localhost mode
  const isLocalhost = process.env.NODE_ENV === 'development' || 
                     process.env.VERCEL_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

  if (isLocalhost && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    // In development without Supabase credentials, use mock client
    const { mockSupabase } = require('./mock-client')
    return mockSupabase
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
