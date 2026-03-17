import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['admin@vintrastudio.com', 'secker@vintrastudio.com']

export async function GET() {
  try {
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      // Import mock data only when needed
      const { mockData } = await import('@/mock-data')
      return NextResponse.json({ organizations: mockData.organizations })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ organizations: data || [] })
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
    // Check if we're in development/localhost mode
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'

    if (isLocalhost) {
      const body = await request.json()
      const { orgId, updates } = body

      if (!orgId || !updates) {
        return NextResponse.json({ error: 'Missing orgId or updates' }, { status: 400 })
      }

      // Import mock data only when needed
      const { mockData } = await import('@/mock-data')
      
      // Find and update the organization in mock data
      const orgIndex = mockData.organizations.findIndex(org => org.id === orgId)
      if (orgIndex === -1) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      // Update the organization
      Object.assign(mockData.organizations[orgIndex], updates)
      
      return NextResponse.json({ organization: mockData.organizations[orgIndex] })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orgId, updates } = body

    if (!orgId || !updates) {
      return NextResponse.json({ error: 'Missing orgId or updates' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ organization: data })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
