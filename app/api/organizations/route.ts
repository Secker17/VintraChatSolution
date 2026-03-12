import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List all organizations the user belongs to
export async function GET() {
  try {
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
    const organizations = memberships?.map(m => ({
      id: m.id,
      role: m.role,
      organization: Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
    })).filter(m => m.organization) || []

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
