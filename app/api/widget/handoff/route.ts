import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400, headers: corsHeaders })
    }

    const supabase = getAdminClient()

    // Mark conversation as handoff requested
    const { error } = await supabase
      .from('conversations')
      .update({ handoff_requested: true, status: 'open' })
      .eq('id', conversationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to request handoff' }, { status: 500, headers: corsHeaders })
    }

    // Insert a system message so both sides can see the request
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'system',
      sender_id: null,
      content: 'Visitor requested to speak with a human agent.',
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Handoff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
