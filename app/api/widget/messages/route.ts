import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Service role client - bypasses RLS, no auth required
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

    const supabase = getAdminClient()

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

      // Increment conversation count (raw SQL-safe increment)
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('conversations_this_month')
        .eq('id', organizationId)
        .single()
      if (currentOrg) {
        await supabase
          .from('organizations')
          .update({ conversations_this_month: (currentOrg.conversations_this_month || 0) + 1 })
          .eq('id', organizationId)
      }
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

    // Trigger real AI response via the dedicated AI endpoint (fire and forget approach
    // — the widget polls for new messages so no need to await here)
    let aiResponse = null

    // Check if AI is enabled and no handoff is active before calling AI
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('enabled, auto_respond_when_offline')
      .eq('organization_id', organizationId)
      .single()

    const { data: onlineAgents } = await supabase
      .from('team_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'online')
      .limit(1)

    const handoffActive = conversation.handoff_requested || conversation.assigned_agent_id
    const noAgentsOnline = !onlineAgents || onlineAgents.length === 0
    const shouldCallAI = aiSettings?.enabled && !handoffActive &&
      (noAgentsOnline || aiSettings?.auto_respond_when_offline)

    if (shouldCallAI) {
      try {
        // Get org widget key for AI endpoint
        const { data: org } = await supabase
          .from('organizations')
          .select('widget_key')
          .eq('id', organizationId)
          .single()

        if (org?.widget_key) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const aiRes = await fetch(`${baseUrl}/api/widget/ai-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              widgetKey: org.widget_key,
              conversationId: conversation.id,
              message,
            }),
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            if (aiData.enabled && aiData.response) {
              // Fetch the saved AI message to return to client
              const { data: aiMsg } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .eq('sender_type', 'ai')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
              aiResponse = aiMsg
            }
          }
        }
      } catch (aiError) {
        console.error('[v0] AI response error (non-fatal, message still saved):', aiError)
        // AI error doesn't block message from being sent
      }
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

  const supabase = getAdminClient()

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
