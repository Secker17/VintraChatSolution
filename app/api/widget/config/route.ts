import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

export async function GET(request: NextRequest) {
  const widgetKey = request.nextUrl.searchParams.get('key')

  if (!widgetKey) {
    return NextResponse.json({ error: 'Widget key required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = await createClient()

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

  const isOnline = (onlineMembers?.length || 0) > 0

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
