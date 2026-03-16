// Mock Supabase client for development
const mockSupabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Mock successful login for any credentials
      return { 
        data: { 
          user: { 
            id: 'mock-user-id', 
            email: email,
            user_metadata: { full_name: 'Mock User' }
          } 
        }, 
        error: null 
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      // Mock successful signup
      return { 
        data: { 
          user: { 
            id: 'mock-user-id', 
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
    getUser: async () => {
      return { 
        data: { 
          user: { 
            id: 'mock-user-id', 
            email: 'mock@example.com',
            user_metadata: { full_name: 'Mock User' }
          } 
        }, 
        error: null 
      }
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: {
            id: 'mock-org-id',
            name: 'Mock Organization',
            plan: 'free',
            widget_key: 'mock-widget-key'
          },
          error: null
        })
      }),
      then: (callback: any) => callback({
        data: [],
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
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 'mock-updated-id' },
            error: null
          })
        })
      })
    })
  }),
  channel: (name: string) => ({
    on: (event: string, config: any, callback?: any) => ({
      subscribe: async () => ({ subscription: null }),
      unsubscribe: () => {}
    })
  }),
  removeChannel: () => {}
}

export { mockSupabase }
