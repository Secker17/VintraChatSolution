import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List all organizations the user belongs to
export async function GET() {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // In development, return mock data
      const { mockData, mockTeamMembers } = await import('@/mock-data')
      const { mockUsers } = await import('@/mock-data')
      
      // Get mock user (first user for simplicity)
      const mockUser = mockUsers[0]
      
      // Get team memberships for this user
      const memberships = mockTeamMembers.filter(m => m.user_id === mockUser.id)
      
      // Transform data to match expected format
      const organizations = memberships.map(m => ({
        id: m.id,
        role: m.role,
        organization: mockData.organizations.find(org => org.id === m.organization_id)
      })).filter(m => m.organization)

      return NextResponse.json({ organizations })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get all team memberships with organization details
    const { data: memberships, error } = await admin
      .from('team_members')
      .select('id, role, organizations(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Transform data
    const organizations = memberships?.map((m: any) => ({
      id: m.id,
      role: m.role,
      organization: Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
    })).filter((m: any) => m.organization) || []

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
