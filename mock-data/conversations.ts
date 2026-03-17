// Mock conversations data for development
export const mockConversations = [
  {
    id: 'conv-1',
    organization_id: 'mock-org-1',
    visitor_id: 'visitor-1',
    assigned_to: 'mock-user-1',
    status: 'open' as const,
    last_message_at: '2024-03-17T09:30:00Z',
    created_at: '2024-03-17T08:45:00Z',
    visitor: {
      id: 'visitor-1',
      name: 'John Doe',
      email: 'john@example.com',
      ip: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      created_at: '2024-03-17T08:45:00Z'
    },
    messages: [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Hello, I need help with your product',
        sender_type: 'visitor' as const,
        sender_id: 'visitor-1',
        created_at: '2024-03-17T08:45:00Z',
        read: true
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-1',
        content: 'Hi! I\'d be happy to help you. What specific product are you interested in?',
        sender_type: 'team_member' as const,
        sender_id: 'mock-user-1',
        created_at: '2024-03-17T09:00:00Z',
        read: true
      },
      {
        id: 'msg-3',
        conversation_id: 'conv-1',
        content: 'I\'m looking at your premium plan',
        sender_type: 'visitor' as const,
        sender_id: 'visitor-1',
        created_at: '2024-03-17T09:15:00Z',
        read: true
      },
      {
        id: 'msg-4',
        conversation_id: 'conv-1',
        content: 'Great choice! The premium plan includes all our features plus priority support.',
        sender_type: 'team_member' as const,
        sender_id: 'mock-user-1',
        created_at: '2024-03-17T09:30:00Z',
        read: true
      }
    ]
  },
  {
    id: 'conv-2',
    organization_id: 'mock-org-1',
    visitor_id: 'visitor-2',
    assigned_to: null,
    status: 'pending' as const,
    last_message_at: '2024-03-17T10:15:00Z',
    created_at: '2024-03-17T10:15:00Z',
    visitor: {
      id: 'visitor-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      ip: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      created_at: '2024-03-17T10:15:00Z'
    },
    messages: [
      {
        id: 'msg-5',
        conversation_id: 'conv-2',
        content: 'Hi, I have a question about pricing',
        sender_type: 'visitor' as const,
        sender_id: 'visitor-2',
        created_at: '2024-03-17T10:15:00Z',
        read: false
      }
    ]
  },
  {
    id: 'conv-3',
    organization_id: 'mock-org-2',
    visitor_id: 'visitor-3',
    assigned_to: 'mock-user-2',
    status: 'closed' as const,
    last_message_at: '2024-03-16T16:45:00Z',
    created_at: '2024-03-16T14:20:00Z',
    visitor: {
      id: 'visitor-3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      ip: '192.168.1.102',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      created_at: '2024-03-16T14:20:00Z'
    },
    messages: [
      {
        id: 'msg-6',
        conversation_id: 'conv-3',
        content: 'Can you help me integrate your widget?',
        sender_type: 'visitor' as const,
        sender_id: 'visitor-3',
        created_at: '2024-03-16T14:20:00Z',
        read: true
      },
      {
        id: 'msg-7',
        conversation_id: 'conv-3',
        content: 'Absolutely! Here are the integration instructions...',
        sender_type: 'team_member' as const,
        sender_id: 'mock-user-2',
        created_at: '2024-03-16T14:35:00Z',
        read: true
      },
      {
        id: 'msg-8',
        conversation_id: 'conv-3',
        content: 'Perfect! Thanks for the help.',
        sender_type: 'visitor' as const,
        sender_id: 'visitor-3',
        created_at: '2024-03-16T16:45:00Z',
        read: true
      }
    ]
  }
]
