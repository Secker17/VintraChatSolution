// Mock server client for development
import { mockUser } from '../mock-data'

export const mockServerClient = {
  auth: {
    getUser: async () => ({
      data: { user: mockUser },
      error: null
    }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      return { 
        data: { 
          user: { 
            ...mockUser,
            email: email,
            user_metadata: { full_name: 'Mock User' }
          } 
        }, 
        error: null 
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      return { 
        data: { 
          user: { 
            ...mockUser,
            email: email,
            user_metadata: { 
              full_name: options?.data?.full_name || 'Mock User',
              organization_name: options?.data?.organization_name || 'Mock Org'
            }
          } 
        }, 
        error: null 
      }
    },
    signOut: async () => {
      return { error: null }
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: null, // Will trigger mock fallback in layout
          error: { code: 'PGRST116', message: 'Mock error' }
        })
      })
    })
  }),
  channel: (name: string) => ({
    on: (event: string, config: any, callback?: any) => ({
      subscribe: async () => ({ subscription: null }),
      unsubscribe: () => {}
    })
  })
}

// Mock admin client
export const mockAdminClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: table === 'organizations' ? {
            id: 'mock-org-id'
          } : null,
          error: null
        }),
        then: (callback: any) => callback({
          data: table === 'organizations' ? [{
            id: 'mock-org-id',
            name: 'Mock Organization',
            owner_id: 'mock-user-id'
          }] : [],
          error: null
        })
      }),
      single: async () => ({
        data: { id: 'mock-new-id' },
        error: null
      })
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: { id: 'mock-new-id' },
          error: null
        })
      })
    }),
    upsert: () => ({
      select: () => ({
        single: async () => {
          if (table === 'team_members') {
            return {
              data: {
                id: 'mock-member-id',
                organization_id: 'mock-org-id',
                user_id: 'mock-user-id',
                role: 'owner',
                display_name: 'Mock User',
                organizations: {
                  id: 'mock-org-id',
                  name: 'Mock Organization',
                  plan: 'free',
                  widget_key: 'mock-widget-key',
                  settings: {
                    primaryColor: '#0066FF',
                    position: 'bottom-right',
                    welcomeMessage: 'Hello! How can I help you today?',
                    offlineMessage: 'Sorry, we are currently offline.',
                    avatar: null,
                    showBranding: true,
                    bubbleIcon: 'chat',
                    bubbleSize: 'medium',
                    bubbleStyle: 'solid',
                    bubbleShadow: true,
                    bubbleAnimation: 'none'
                  },
                  stripe_customer_id: null,
                  stripe_subscription_id: null,
                  billing_cycle_start: new Date().toISOString(),
                  ai_responses_used: 0,
                  conversations_this_month: 0,
                  created_at: new Date().toISOString()
                }
              },
              error: null
            }
          }
          return { data: { id: 'mock-upsert-id' }, error: null }
        }
      })
    })
  }),
  channel: (name: string) => ({
    on: (event: string, config: any, callback?: any) => ({
      subscribe: async () => ({ subscription: null }),
      unsubscribe: () => {}
    })
  })
}
