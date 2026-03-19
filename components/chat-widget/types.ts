export interface ChatMessage {
  id: string
  sender_type: 'visitor' | 'agent' | 'ai' | 'system'
  content: string
  created_at: string
}

export interface ChatWidgetConfig {
  organizationId?: string
  name: string
  settings: WidgetSettings
  aiEnabled?: boolean
  aiWelcomeMessage?: string
  isOnline?: boolean
}

export interface WidgetSettings {
  primaryColor?: string
  position?: 'bottom-left' | 'bottom-right'
  welcomeMessage?: string
  offlineMessage?: string
  avatar?: string | null
  showBranding?: boolean
  bubbleIcon?: string
  bubbleSize?: 'small' | 'medium' | 'large'
  bubbleStyle?: 'solid' | 'gradient' | 'outline'
  bubbleShadow?: boolean
  bubbleAnimation?: 'none' | 'pulse' | 'bounce' | 'shake'
  glassOrbGlyph?: string
  quickReplies?: Array<{ id: string; text: string }>
  faqItems?: Array<{ id: string; question: string; answer: string }>
  helpCenterTitle?: string
  helpCenterEnabled?: boolean
  responseTimeText?: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}
