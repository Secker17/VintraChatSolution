import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'

// Service role client - bypasses RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    // First verify the user is authenticated
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()

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
