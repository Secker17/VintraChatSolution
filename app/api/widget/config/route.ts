import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

// Service role client - bypasses RLS, no auth required
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const widgetKey = request.nextUrl.searchParams.get('key')

  if (!widgetKey) {
    return NextResponse.json({ error: 'Widget key required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = getAdminClient()

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('id, name, settings, widget_key')
    .eq('widget_key', widgetKey)
    .single()

  if (error || !organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404, headers: corsHeaders })
  }

  // Get AI settings
  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .single()

  // Check if any team member is online
  const { data: onlineMembers } = await supabase
    .from('team_members')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('status', 'online')

  // Show as online if either agents are online OR AI is enabled
  const hasOnlineAgents = (onlineMembers?.length || 0) > 0
  const isOnline = hasOnlineAgents || (aiSettings?.enabled ?? false)

  // Ensure all settings have defaults
  const settings = {
    primaryColor: organization.settings?.primaryColor || '#0066FF',
    position: organization.settings?.position || 'bottom-right',
    welcomeMessage: organization.settings?.welcomeMessage || 'Hi! How can we help you?',
    offlineMessage: organization.settings?.offlineMessage || 'We are currently offline.',
    showBranding: organization.settings?.showBranding ?? true,
    bubbleIcon: organization.settings?.bubbleIcon || 'chat',
    bubbleSize: organization.settings?.bubbleSize || 'medium',
    bubbleStyle: organization.settings?.bubbleStyle || 'solid',
    bubbleShadow: organization.settings?.bubbleShadow ?? true,
    bubbleAnimation: organization.settings?.bubbleAnimation || 'none',
    glassOrbGlyph: organization.settings?.glassOrbGlyph || 'V',
    quickReplies: organization.settings?.quickReplies || [],
    faqItems: organization.settings?.faqItems || [],
    helpCenterTitle: organization.settings?.helpCenterTitle || 'Help Center',
    helpCenterEnabled: organization.settings?.helpCenterEnabled ?? true,
    responseTimeText: organization.settings?.responseTimeText || 'We typically reply in a few minutes',
  }

  return NextResponse.json({
    organizationId: organization.id,
    name: organization.name,
    settings,
    aiEnabled: aiSettings?.enabled || false,
    aiWelcomeMessage: aiSettings?.welcome_message,
    isOnline,
  }, { headers: corsHeaders })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
