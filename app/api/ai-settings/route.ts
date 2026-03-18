import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organization_id, enabled, welcome_message, fallback_message, knowledge_base, response_style, auto_respond_when_offline } = body

    if (!organization_id) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400, headers: corsHeaders })
    }

    const supabase = getAdminClient()

    // Use upsert with admin client to bypass RLS
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert({
        organization_id,
        enabled,
        welcome_message,
        fallback_message,
        knowledge_base,
        response_style,
        auto_respond_when_offline,
      }, { onConflict: 'organization_id' })
      .select()
      .single()

    if (error) {
      console.error('[v0] Error saving AI settings:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json(data, { headers: corsHeaders })
  } catch (error) {
    console.error('[v0] Error in AI settings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
