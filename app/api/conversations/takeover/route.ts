import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await request.json()
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    }

    // Get the agent's team_member record
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Assign agent and clear handoff flag
    const { error } = await supabase
      .from('conversations')
      .update({
        assigned_agent_id: teamMember.id,
        handoff_requested: false,
      })
      .eq('id', conversationId)
      .eq('organization_id', teamMember.organization_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to take over' }, { status: 500 })
    }

    // Insert system message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'system',
      sender_id: null,
      content: 'An agent has joined the conversation.',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Takeover error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
