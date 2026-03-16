import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to accept an invitation' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get the invitation
    const { data: invitation, error: inviteError } = await admin
      .from('team_invitations')
      .select('*, organizations(name)')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: `This invitation has already been ${invitation.status}` }, { status: 400 })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await admin
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if user's email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'This invitation was sent to a different email address' 
      }, { status: 403 })
    }

    // Check if user is already a member of this organization
    const { data: existingMember } = await admin
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single()

    if (existingMember) {
      // Mark invitation as accepted and return success
      await admin
        .from('team_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
      
      return NextResponse.json({ 
        message: 'You are already a member of this organization',
        organization_id: invitation.organization_id
      })
    }

    // Create team member record
    const { error: memberError } = await admin
      .from('team_members')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        display_name: user.email?.split('@')[0] || 'Team Member',
      })

    if (memberError) {
      console.error('Error creating team member:', memberError)
      return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
    }

    // Mark invitation as accepted
    await admin
      .from('team_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    const orgName = Array.isArray(invitation.organizations) 
      ? invitation.organizations[0]?.name 
      : (invitation.organizations as { name: string })?.name || 'the organization'

    return NextResponse.json({ 
      message: `You have successfully joined ${orgName}`,
      organization_id: invitation.organization_id
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get invitation details by token (for preview)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: invitation, error } = await admin
      .from('team_invitations')
      .select('id, email, role, status, expires_at, organizations(name)')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    const orgName = Array.isArray(invitation.organizations) 
      ? invitation.organizations[0]?.name 
      : (invitation.organizations as { name: string })?.name || 'Unknown'

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      organization_name: orgName,
      is_expired: new Date(invitation.expires_at) < new Date(),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
