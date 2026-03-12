import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Create invitations table if it doesn't exist
export async function POST() {
  try {
    const admin = createAdminClient()
    
    // Check if table exists by trying to select from it
    const { error: checkError } = await admin
      .from('invitations')
      .select('id')
      .limit(1)

    // If table doesn't exist, we'll get an error
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist - create it via raw SQL
      const { error: createError } = await admin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS invitations (
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
          );
          
          CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
          CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
          CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
        `
      })

      if (createError) {
        console.error('Error creating table via RPC:', createError)
        return NextResponse.json({ 
          error: 'Could not create invitations table. Please create it manually in Supabase.',
          manual_sql: `
CREATE TABLE invitations (
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
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
          `
        }, { status: 500 })
      }

      return NextResponse.json({ message: 'Invitations table created successfully' })
    }

    return NextResponse.json({ message: 'Invitations table already exists' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
