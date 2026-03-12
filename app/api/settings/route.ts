import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, settings, name } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()

    // Verify user belongs to this organization
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (settings) updateData.settings = settings
    if (name) updateData.name = name

    // Update organization
    const { data: org, error } = await admin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teamMemberId, displayName } = body

    if (!teamMemberId) {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()

    // Verify the team member belongs to the user
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id')
      .eq('id', teamMemberId)
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update team member
    const { data: updated, error } = await admin
      .from('team_members')
      .update({ display_name: displayName })
      .eq('id', teamMemberId)
      .select()
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ teamMember: updated })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
