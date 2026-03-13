import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { mockOrganization, mockTeamMember, mockUser } from '@/lib/mock-data'

/**
 * Helper function to handle authentication in dashboard pages
 * Returns mock data in development mode when Supabase is not configured
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if we're in mock mode
  const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isMockMode) {
    console.log('Using mock auth in requireAuth')
    return {
      user: mockUser,
      organization: mockOrganization,
      teamMember: mockTeamMember
    }
  }

  if (!user) {
    redirect('/auth/login')
  }

  return { user }
}
