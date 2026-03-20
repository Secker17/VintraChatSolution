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
  // Core settings
  primaryColor?: string
  position?: 'bottom-left' | 'bottom-right'
  welcomeMessage?: string
  offlineMessage?: string
  avatar?: string | null
  showBranding?: boolean
  
  // Bubble settings
  bubbleIcon?: 'default' | 'glassOrb' | 'chat' | 'message' | 'support' | 'wave'
  bubbleSize?: 'small' | 'medium' | 'large'
  bubbleStyle?: 'solid' | 'gradient' | 'outline'
  bubbleShadow?: boolean
  bubbleAnimation?: 'none' | 'pulse' | 'bounce' | 'shake'
  glassOrbGlyph?: string
  
  // Theme settings
  customTheme?: 'light' | 'dark' | 'auto'
  fontFamily?: string
  borderRadius?: 'small' | 'medium' | 'large'
  
  // Behavior settings
  soundEnabled?: boolean
  autoOpen?: boolean
  responseTimeText?: string
  
  // Content settings
  quickReplies?: Array<{ id: string; text: string }>
  faqItems?: Array<{ id: string; question: string; answer: string }>
  helpCenterTitle?: string
  helpCenterEnabled?: boolean
  
  // AI settings
  aiEnabled?: boolean
  aiWelcomeMessage?: string
  aiModel?: 'gpt-3.5' | 'gpt-4' | 'claude-3'
  
  // Advanced settings
  hideOnDesktop?: boolean
  hideOnMobile?: boolean
  showTimestamps?: boolean
  allowFileUpload?: boolean
  allowEmoji?: boolean
  autoScroll?: boolean
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}
