// Mock Supabase client for development
import { mockData, mockConversations, mockTeamMembers } from '@/mock-data'

const mockSupabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Mock successful login for any credentials
      // For admin panel, check if email matches admin emails
      const isAdmin = email === 'admin@vintrastudio.com' || email === 'secker@vintrastudio.com'
      const user = isAdmin 
        ? mockData.users.find(u => u.email === email)
        : mockData.users[0] // Return first mock user for other logins
      
      return { 
        data: { 
          user: user || {
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
      // For localhost development, always return admin user to bypass auth
      return { 
        data: { 
          user: mockData.users[0] // Admin user
        }, 
        error: null 
      }
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  from: (table: string) => ({
    select: (columns?: string, options?: any) => {
      const queryState = {
        filters: [] as Array<{ column: string; value: string }>,
        orderColumn: '',
        orderOptions: null,
        limitValue: 0
      };
      
      const queryBuilder: any = {
        eq: function(column: string, value: string) {
          queryState.filters.push({ column, value });
          return this;
        },
        
        order: function(column: string, orderOptions: any) {
          queryState.orderColumn = column;
          queryState.orderOptions = orderOptions;
          return this;
        },
        
        limit: function(limit: number) {
          queryState.limitValue = limit;
          return this;
        },
        
        single: async () => {
          let data: any = mockData.organizations.find(o => o.id === 'mock-org-1') || null;
          
          // Apply filters
          queryState.filters.forEach((filter: any) => {
            if (table === 'organizations') {
              data = mockData.organizations.find(o => o[filter.column as keyof typeof o] === filter.value) || null;
            }
          });
          
          if (table === 'team_members') {
            data = {
              id: 'mock-member-id',
              organization_id: 'mock-org-1',
              user_id: 'mock-user-1',
              role: 'admin',
              status: 'online',
              display_name: 'Mock User',
              avatar_url: null,
              created_at: new Date().toISOString(),
              organizations: mockData.organizations[0]
            };
          }
          
          return { data, error: null };
        },
        
        then: function(callback: any) {
          let data: any[] = [];
          
          if (table === 'organizations') {
            data = mockData.organizations;
          } else if (table === 'conversations') {
            data = mockConversations;
          } else if (table === 'team_members') {
            data = mockTeamMembers;
          }
          
          // Apply filters
          queryState.filters.forEach((filter: any) => {
            data = data.filter((item: any) => item[filter.column] === filter.value);
          });
          
          // Apply ordering
          if (queryState.orderColumn && table === 'conversations') {
            data = [...data].sort((a, b) => {
              const aValue = a[queryState.orderColumn as keyof typeof a];
              const bValue = b[queryState.orderColumn as keyof typeof b];
              if (queryState.orderColumn === 'last_message_at' || queryState.orderColumn === 'created_at') {
                return new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
              }
              return 0;
            });
          }
          
          // Apply limit
          if (queryState.limitValue) {
            data = data.slice(0, queryState.limitValue);
          }
          
          // Handle count options
          if (options && options.count === 'exact' && options.head === true) {
            callback({ count: data.length, error: null });
          } else {
            callback({ data, error: null });
          }
          
          return { catch: () => {} };
        }
      };
      
      return queryBuilder;
    },
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: { id: 'mock-new-id' },
          error: null
        })
      })
    }),
    update: (updates: any) => ({
      eq: (column: string, value: string) => ({
        select: () => ({
          single: async () => {
            if (table === 'organizations') {
              const org = mockData.organizations.find(o => o[column as keyof typeof o] === value)
              if (org && updates) {
                Object.assign(org, updates)
              }
              return { data: org, error: null }
            }
            return { data: { id: 'mock-updated-id' }, error: null }
          }
        })
      })
    })
  }),
  channel: (name: string) => {
  const channelHandlers: Array<{ event: string; config: any; callback?: any }> = [];
  
  return {
    on: (event: string, config: any, callback?: any) => {
      channelHandlers.push({ event, config, callback });
      
      return {
        on: (event2: string, config2: any, callback2?: any) => {
          channelHandlers.push({ event: event2, config: config2, callback: callback2 });
          
          return {
            subscribe: async () => {
              // Mock subscription - in real-time this would listen for changes
              // For mock, we can simulate occasional updates if needed
              return { subscription: null };
            },
            unsubscribe: () => {
              // Mock unsubscribe
            }
          };
        },
        subscribe: async () => {
          // Mock subscription
          return { subscription: null };
        },
        unsubscribe: () => {
          // Mock unsubscribe
        }
      };
    },
    subscribe: async () => {
      // Mock subscription
      return { subscription: null };
    },
    unsubscribe: () => {
      // Mock unsubscribe
    }
  };
},
  removeChannel: () => {}
}

export { mockSupabase }
