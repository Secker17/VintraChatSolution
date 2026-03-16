import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get team member's organization
    const { data: teamMember } = await admin
      .from('team_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Fetch all conversations for the organization with visitor details and messages
    const { data: conversations, error } = await admin
      .from('conversations')
      .select(`
        *,
        visitor:visitors(*),
        messages(*)
      `)
      .eq('organization_id', teamMember.organization_id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Sort messages within each conversation
    const sortedConversations = (conversations || []).map(conv => ({
      ...conv,
      messages: (conv.messages || []).sort((a: { created_at: string }, b: { created_at: string }) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }))

    return NextResponse.json({ conversations: sortedConversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
