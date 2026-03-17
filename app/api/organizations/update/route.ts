import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (!isLocalhost) {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 })
    }

    const body = await request.json()
    const { plan } = body

    if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // In development, get user from mock data
    const { mockData, mockTeamMembers, mockUsers } = await import('@/mock-data')
    
    // Get mock user (first user for simplicity)
    const mockUser = mockUsers[0]
    
    // Find the user's organization
    const userMembership = mockTeamMembers.find(m => m.user_id === mockUser.id)
    if (!userMembership) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 })
    }

    // Find and update the organization
    const orgIndex = mockData.organizations.findIndex(org => org.id === userMembership.organization_id)
    if (orgIndex === -1) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update the organization plan
    mockData.organizations[orgIndex].plan = plan as 'free' | 'pro' | 'enterprise'
    
    return NextResponse.json({ 
      success: true, 
      plan,
      organization: mockData.organizations[orgIndex]
    })
  } catch (error) {
    console.error('Error in plan update API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
