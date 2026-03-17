import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // In development, use mock data
      const { memberId, status } = await request.json()

      if (!memberId || !status) {
        return NextResponse.json({ error: 'Member ID and status are required' }, { status: 400 })
      }

      if (!['online', 'offline', 'away'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      const { mockTeamMembers, mockUsers } = await import('@/mock-data')
      
      // Get mock user (admin)
      const mockUser = mockUsers[0]
      
      // Verify user owns this team member record
      const teamMember = mockTeamMembers.find(m => m.id === memberId)
      
      if (!teamMember || teamMember.user_id !== mockUser.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Update status in mock data
      teamMember.status = status as 'online' | 'offline' | 'away'

      return NextResponse.json({ message: 'Status updated' })
    }

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
