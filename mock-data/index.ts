// Export all mock data for easy import
export { mockOrganizations } from './organizations'
export { mockConversations } from './conversations'
export { mockTeamMembers } from './team-members'
export { mockUsers } from './users'

// Import the full organizations data with settings
import { mockOrganizations as fullMockOrganizations } from './organizations'

// Combined mock data for convenience
export const mockData = {
  organizations: fullMockOrganizations,
  users: [
    {
      id: 'mock-user-1',
      email: 'admin@vintrastudio.com',
      user_metadata: { 
        full_name: 'Alice Johnson',
        organization_name: 'Demo Company'
      },
      app_metadata: { role: 'admin' },
      aud: 'authenticated',
      created_at: '2024-01-15T10:30:00Z'
    }
  ]
}
