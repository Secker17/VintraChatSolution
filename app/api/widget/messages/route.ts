import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, sessionId, message, visitorName, visitorEmail } = body

    if (!organizationId || !sessionId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = await createClient()

    // Get or create visitor
    let { data: visitor } = await supabase
      .from('visitors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('session_id', sessionId)
      .single()

    if (!visitor) {
      const { data: newVisitor, error: visitorError } = await supabase
        .from('visitors')
        .insert({
          organization_id: organizationId,
          session_id: sessionId,
          name: visitorName || null,
          email: visitorEmail || null,
        })
        .select()
        .single()

      if (visitorError) {
        console.error('Error creating visitor:', visitorError)
        return NextResponse.json({ error: 'Failed to create visitor' }, { status: 500, headers: corsHeaders })
      }
      visitor = newVisitor
    } else if (visitorName || visitorEmail) {
      // Update visitor info if provided
      await supabase
        .from('visitors')
        .update({
          name: visitorName || visitor.name,
          email: visitorEmail || visitor.email,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', visitor.id)
    }

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('visitor_id', visitor.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          visitor_id: visitor.id,
          status: 'open',
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: corsHeaders })
      }
      conversation = newConversation

      // Increment conversation count
      await supabase.rpc('increment_conversations', { org_id: organizationId })
    }

    // Create message
    const { data: newMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'visitor',
        sender_id: visitor.id,
        content: message,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error creating message:', msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500, headers: corsHeaders })
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)

    // Check if AI auto-response is enabled and no agents are online
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    const { data: onlineAgents } = await supabase
      .from('team_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'online')

    const shouldAutoRespond = aiSettings?.enabled && 
      aiSettings?.auto_respond_when_offline && 
      (!onlineAgents || onlineAgents.length === 0)

    let aiResponse = null

    if (shouldAutoRespond) {
      // Generate AI response (simplified - you'd integrate with actual AI here)
      const aiResponseContent = aiSettings.welcome_message || 
        "Thanks for your message! Our team will get back to you shortly."

      const { data: aiMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'ai',
          sender_id: null,
          content: aiResponseContent,
        })
        .select()
        .single()

      aiResponse = aiMsg
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: newMessage,
      aiResponse,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Widget message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ messages }, { headers: corsHeaders })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
