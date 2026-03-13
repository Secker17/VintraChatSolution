import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get team member with organization
    const { data: teamMember, error: teamError } = await admin
      .from('team_members')
      .select('organization_id, organizations(widget_key, name, settings)')
      .eq('user_id', user.id)
      .single()

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const organization = Array.isArray(teamMember.organizations)
      ? teamMember.organizations[0]
      : teamMember.organizations

    const widgetKey = organization?.widget_key || null
    const orgName = organization?.name || 'Chat Widget'
    const settings = organization?.settings || {}

    // Check if widget has been used (any visitors exist)
    let visitorCount = 0
    if (teamMember.organization_id) {
      const { count } = await admin
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', teamMember.organization_id)
      
      visitorCount = count || 0
    }

    return NextResponse.json({
      widgetKey,
      organizationId: teamMember.organization_id,
      hasVisitors: visitorCount > 0,
      name: orgName,
      settings,
    })
  } catch (error) {
    console.error('Error fetching widget info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
