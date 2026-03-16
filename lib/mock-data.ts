// Mock data for development
export const mockOrganization = {
  id: 'mock-org-id',
  name: 'Mock Organization',
  plan: 'free' as const,
  widget_key: 'mock-widget-key',
  owner_id: 'mock-user-id',
  settings: {
    primaryColor: '#0066FF',
    position: 'bottom-right' as const,
    welcomeMessage: 'Hello! How can I help you today?',
    offlineMessage: 'Sorry, we are currently offline. Please leave a message.',
    avatar: null,
    showBranding: true,
    bubbleIcon: 'chat' as const,
    bubbleSize: 'medium' as const,
    bubbleStyle: 'solid' as const,
    bubbleShadow: true,
    bubbleAnimation: 'none' as const
  },
  stripe_customer_id: null,
  stripe_subscription_id: null,
  billing_cycle_start: new Date().toISOString(),
  ai_responses_used: 0,
  conversations_this_month: 0,
  created_at: new Date().toISOString()
}

export const mockTeamMember = {
  id: 'mock-member-id',
  organization_id: 'mock-org-id',
  user_id: 'mock-user-id',
  role: 'admin' as const,
  status: 'online' as const,
  display_name: 'Mock User',
  avatar_url: null,
  created_at: new Date().toISOString()
}

export const mockUser = {
  id: 'mock-user-id',
  email: 'mock@example.com',
  user_metadata: { 
    full_name: 'Mock User',
    organization_name: 'Mock Organization'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
}
