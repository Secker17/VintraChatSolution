import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// POST - Switch to a different organization
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user is a member of this organization
    const { data: membership, error } = await admin
      .from('team_members')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (error || !membership) {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 })
    }

    // Store the selected organization in a cookie
    const cookieStore = await cookies()
    cookieStore.set('selected_org', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return NextResponse.json({ message: 'Organization switched', organizationId })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
