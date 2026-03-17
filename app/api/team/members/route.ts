import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE - Remove team member
export async function DELETE(request: Request) {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // In development, use mock data
      const { searchParams } = new URL(request.url)
      const memberId = searchParams.get('id')

      if (!memberId) {
        return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
      }

      const { mockTeamMembers, mockUsers } = await import('@/mock-data')
      
      // Get mock user (admin)
      const mockUser = mockUsers[0]
      
      // Get current user's team member record
      const currentMember = mockTeamMembers.find(m => m.user_id === mockUser.id)
      
      if (!currentMember || !['admin', 'owner'].includes(currentMember.role)) {
        return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
      }

      // Get target member
      const targetMember = mockTeamMembers.find(m => m.id === memberId)
      
      if (!targetMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }

      // Verify same organization
      if (targetMember.organization_id !== currentMember.organization_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Prevent removing admin
      if (targetMember.role === 'admin') {
        return NextResponse.json({ error: 'Cannot remove admin team members' }, { status: 403 })
      }

      // Remove from mock data
      const index = mockTeamMembers.findIndex(m => m.id === memberId)
      if (index > -1) {
        mockTeamMembers.splice(index, 1)
      }

      return NextResponse.json({ message: 'Member removed' })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get current user's team member record
    const { data: currentMember } = await admin
      .from('team_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if user has permission (owner or admin)
    if (!['owner', 'admin'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await admin
      .from('team_members')
      .select('organization_id, role')
      .eq('id', memberId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify same organization
    if (targetMember.organization_id !== currentMember.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prevent removing owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 403 })
    }

    // Delete team member
    const { error } = await admin
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
