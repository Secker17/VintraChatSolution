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

// Mock data for development when env vars are not set
const mockOrganization = {
  id: 'demo-org-123',
  name: 'Demo Organization',
  widget_key: 'demo-widget-key-123',
  settings: {
    primaryColor: '#0066FF',
    position: 'bottom-right',
    welcomeMessage: 'Hi! How can we help you?',
    offlineMessage: 'We are currently offline.',
    showBranding: true,
    bubbleIcon: 'chat',
    bubbleSize: 'medium',
    bubbleStyle: 'solid',
    bubbleShadow: true,
    bubbleAnimation: 'none',
    glassOrbGlyph: 'V',
    quickReplies: [
      { id: '1', text: 'What are your hours?' },
      { id: '2', text: 'How can I contact support?' },
      { id: '3', text: 'Pricing information' }
    ],
    faqItems: [
      {
        id: '1',
        question: 'What are your business hours?',
        answer: 'We are available Monday through Friday, 9 AM to 6 PM EST.'
      },
      {
        id: '2',
        question: 'How do I get support?',
        answer: 'You can reach our support team through this chat widget or by emailing support@example.com.'
      },
      {
        id: '3',
        question: 'What services do you offer?',
        answer: 'We offer a wide range of services including customer support, technical assistance, and consulting.'
      }
    ],
    helpCenterTitle: 'Help Center',
    helpCenterEnabled: true,
    responseTimeText: 'We typically reply in a few minutes',
  }
}

const mockAiSettings = {
  enabled: true,
  welcome_message: 'Hello! I\'m your AI assistant. How can I help you today?'
}

// Service role client - bypasses RLS, no auth required
function getAdminClient() {
  // Check if environment variables are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase environment variables not found, using mock data')
    return null
  }
  
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

  // If supabase is not available, use mock data
  if (!supabase) {
    console.log('Using mock data for widget config')
    
    if (widgetKey === 'demo-widget-key-123') {
      // Show as online if either agents are online OR AI is enabled
      const isOnline = mockAiSettings.enabled

      return NextResponse.json({
        organizationId: mockOrganization.id,
        name: mockOrganization.name,
        settings: mockOrganization.settings,
        aiEnabled: mockAiSettings.enabled,
        aiWelcomeMessage: mockAiSettings.welcome_message,
        isOnline,
      }, { headers: corsHeaders })
    } else {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404, headers: corsHeaders })
    }
  }

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
