import { NextResponse } from 'next/server'
import { mockData } from '@/mock-data'

const ADMIN_EMAILS = ['admin@vintrastudio.com', 'secker@vintrastudio.com']

export async function GET() {
  try {
    // For localhost development, bypass authentication check
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (!isLocalhost) {
      // In production, you would implement proper authentication here
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return mock organizations
    return NextResponse.json({ organizations: mockData.organizations })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    // For localhost development, bypass authentication check
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (!isLocalhost) {
      // In production, you would implement proper authentication here
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orgId, updates } = body

    if (!orgId || !updates) {
      return NextResponse.json({ error: 'Missing orgId or updates' }, { status: 400 })
    }

    // Find and update the organization in mock data
    const orgIndex = mockData.organizations.findIndex(org => org.id === orgId)
    if (orgIndex === -1) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update the organization
    Object.assign(mockData.organizations[orgIndex], updates)
    
    return NextResponse.json({ organization: mockData.organizations[orgIndex] })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
