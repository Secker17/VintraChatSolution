import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // In development, return mock data
      const { mockConversations, mockTeamMembers, mockUsers } = await import('@/mock-data')
      
      // Get mock user (admin)
      const mockUser = mockUsers[0]
      
      // Get user's team member record
      const teamMember = mockTeamMembers.find(m => m.user_id === mockUser.id)
      
      if (!teamMember) {
        return NextResponse.json({ error: 'User not in organization' }, { status: 403 })
      }

      // Filter conversations for this organization
      const orgConversations = mockConversations.filter(c => c.organization_id === teamMember.organization_id)

      return NextResponse.json({ conversations: orgConversations })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: teamMember } = await admin
      .from('team_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'User not in organization' }, { status: 403 })
    }

    const { data: conversations, error } = await admin
      .from('conversations')
      .select('*, visitor:visitors(*), messages(*)')
      .eq('organization_id', teamMember.organization_id)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
