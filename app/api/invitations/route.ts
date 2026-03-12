import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// GET - List invitations for organization
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    
    // Get user's team member record
    const { data: teamMember } = await admin
      .from('team_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Get invitations for this organization
    const { data: invitations, error } = await admin
      .from('invitations')
      .select('*')
      .eq('organization_id', teamMember.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist - return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ invitations: [] })
      }
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create and send invitation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    
    // First check if invitations table exists
    const { error: tableCheck } = await admin
      .from('invitations')
      .select('id')
      .limit(1)
    
    if (tableCheck && (tableCheck.code === '42P01' || tableCheck.message?.includes('does not exist'))) {
      return NextResponse.json({ 
        error: 'Invitations table not set up. Please run the SQL migration in Supabase Dashboard.',
        setupRequired: true,
        sql: `CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES team_members(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);`
      }, { status: 400 })
    }
    
    // Get user's team member and organization
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id, organization_id, role, organizations(name)')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Check if user has permission to invite (owner or admin)
    if (!['owner', 'admin'].includes(teamMember.role)) {
      return NextResponse.json({ error: 'Only admins can send invitations' }, { status: 403 })
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await admin
      .from('invitations')
      .select('id')
      .eq('organization_id', teamMember.organization_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 })
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invitation
    const { data: invitation, error: inviteError } = await admin
      .from('invitations')
      .insert({
        organization_id: teamMember.organization_id,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: teamMember.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Get organization name
    const orgName = Array.isArray(teamMember.organizations) 
      ? teamMember.organizations[0]?.name 
      : (teamMember.organizations as { name: string })?.name || 'VintraChat'

    // Send invitation email via Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    
    try {
      await resend.emails.send({
        from: 'VintraChat <noreply@resend.dev>',
        to: email,
        subject: `You've been invited to join ${orgName} on VintraChat`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #000; font-size: 24px; margin: 0;">VintraChat</h1>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
              <h2 style="margin-top: 0; color: #111;">You're invited!</h2>
              <p>You've been invited to join <strong>${orgName}</strong> as a team member on VintraChat.</p>
              <p>Role: <strong>${role === 'admin' ? 'Administrator' : 'Agent'}</strong></p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: #000; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
            </div>
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Still return success - invitation was created, email just failed
      return NextResponse.json({ 
        invitation, 
        warning: 'Invitation created but email could not be sent' 
      })
    }

    return NextResponse.json({ invitation, message: 'Invitation sent successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel invitation
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    
    // Get user's team member
    const { data: teamMember } = await admin
      .from('team_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update invitation status to cancelled
    const { error } = await admin
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('organization_id', teamMember.organization_id)

    if (error) {
      console.error('Error cancelling invitation:', error)
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invitation cancelled' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
