export interface Organization {
  id: string
  name: string
  owner_id: string
  widget_key: string
  settings: WidgetSettings
  plan: 'free' | 'pro' | 'enterprise'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  ai_responses_used: number
  conversations_this_month: number
  billing_cycle_start: string
  created_at: string
}

export interface WidgetSettings {
  primaryColor: string
  position: 'bottom-right' | 'bottom-left'
  welcomeMessage: string
  offlineMessage: string
  avatar: string | null
  showBranding: boolean
  bubbleIcon: 'chat' | 'message' | 'support' | 'wave' | 'glassOrb'
  bubbleSize: 'small' | 'medium' | 'large'
  bubbleStyle: 'solid' | 'gradient' | 'outline'
  bubbleShadow: boolean
  bubbleAnimation: 'none' | 'pulse' | 'bounce' | 'shake'
  glassOrbGlyph?: string
}

export interface TeamMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'agent'
  status: 'online' | 'offline' | 'away'
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Visitor {
  id: string
  organization_id: string
  session_id: string
  name: string | null
  email: string | null
  metadata: Record<string, unknown>
  last_seen_at: string
  created_at: string
}

export interface Conversation {
  id: string
  organization_id: string
  visitor_id: string
  assigned_to: string | null
  status: 'open' | 'resolved' | 'pending'
  subject: string | null
  last_message_at: string
  created_at: string
  updated_at: string
  visitor?: Visitor
  messages?: Message[]
  assigned_member?: TeamMember
  // Computed/derived fields (not from DB)
  assigned_agent_id?: string | null
  handoff_requested?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'visitor' | 'agent' | 'ai' | 'system'
  sender_id: string | null
  content: string
  read_at: string | null
  created_at: string
}

export interface AISettings {
  id: string
  organization_id: string
  enabled: boolean
  welcome_message: string
  fallback_message: string
  knowledge_base: string
  response_style: 'friendly' | 'professional' | 'casual'
  auto_respond_when_offline: boolean
  created_at: string
}

export interface CannedResponse {
  id: string
  organization_id: string
  shortcut: string
  title: string
  content: string
  created_at: string
}

export interface PlanLimits {
  conversations: number
  aiResponses: number
  teamMembers: number
  customBranding: boolean
}

export const PLAN_LIMITS: Record<Organization['plan'], PlanLimits> = {
  free: {
    conversations: 100,
    aiResponses: 50,
    teamMembers: 1,
    customBranding: false,
  },
  pro: {
    conversations: 1000,
    aiResponses: 500,
    teamMembers: 5,
    customBranding: true,
  },
  enterprise: {
    conversations: -1,
    aiResponses: -1,
    teamMembers: -1,
    customBranding: true,
  },
}

/** Safe accessor — always returns a PlanLimits object even for unknown/undefined plans */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan as Organization['plan']] ?? PLAN_LIMITS.free
}
