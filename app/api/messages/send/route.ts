import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // In development, use mock data
      const { conversation_id, content } = await request.json()

      if (!conversation_id || !content) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { mockConversations, mockTeamMembers, mockUsers } = await import('@/mock-data')
      
      // Get mock user (admin)
      const mockUser = mockUsers[0]
      
      // Get user's team member record
      const teamMember = mockTeamMembers.find(m => m.user_id === mockUser.id)
      
      if (!teamMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }

      // Find the conversation
      const conversation = mockConversations.find(c => c.id === conversation_id)
      
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      // Debug logging
      console.log('Debug - Conversation org:', conversation.organization_id)
      console.log('Debug - Team member org:', teamMember.organization_id)
      console.log('Debug - Conversation ID:', conversation_id)

      if (conversation.organization_id !== teamMember.organization_id) {
        console.log('Debug - Organization mismatch!')
        return NextResponse.json({ error: 'Unauthorized access to conversation' }, { status: 403 })
      }

      // Create mock message
      const newMessage = {
        id: `msg-${Date.now()}`,
        conversation_id,
        content: content.trim(),
        sender_type: 'visitor' as const,
        sender_id: teamMember.id,
        created_at: new Date().toISOString(),
        read: true
      }

      // Add message to conversation
      conversation.messages.push(newMessage)
      conversation.last_message_at = new Date().toISOString()

      return NextResponse.json({ message: newMessage })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversation_id, content } = await request.json()

    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()

    // Get team member
    const { data: teamMember, error: tmError } = await admin
      .from('team_members')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    if (tmError || !teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify conversation belongs to same organization
    const { data: conversation, error: convError } = await admin
      .from('conversations')
      .select('id, organization_id')
      .eq('id', conversation_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== teamMember.organization_id) {
      return NextResponse.json({ error: 'Unauthorized access to conversation' }, { status: 403 })
    }

    // Insert the message
    const { data: message, error: msgError } = await admin
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        sender_id: teamMember.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error inserting message:', msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation last_message_at
    await admin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error in messages/send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
