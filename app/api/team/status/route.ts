import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberId, status } = await request.json()

    if (!memberId || !status) {
      return NextResponse.json({ error: 'Member ID and status are required' }, { status: 400 })
    }

    if (!['online', 'offline', 'away'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user owns this team member record
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id, user_id')
      .eq('id', memberId)
      .single()

    if (!teamMember || teamMember.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update status
    const { error } = await admin
      .from('team_members')
      .update({ status })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating status:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Status updated' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
