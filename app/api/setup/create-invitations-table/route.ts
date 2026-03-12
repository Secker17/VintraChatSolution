import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const admin = createAdminClient()
    
    // Check if table already exists
    const { error: checkError } = await admin
      .from('invitations')
      .select('id')
      .limit(1)
    
    // If no error, table exists
    if (!checkError) {
      return NextResponse.json({ message: 'Invitations table already exists' })
    }
    
    // Table doesn't exist - we need to create it via SQL
    // Since we can't execute raw SQL via the client, we need to use the REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        manualSetup: true,
        sql: getCreateTableSQL()
      }, { status: 500 })
    }

    // Use the Supabase Management API or direct PostgreSQL
    // Since we can't do raw SQL easily, provide instructions
    return NextResponse.json({ 
      error: 'Please create the invitations table manually in Supabase Dashboard',
      manualSetup: true,
      sql: getCreateTableSQL(),
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Click on "SQL Editor" in the left sidebar',
        '3. Paste the SQL below and click "Run"',
      ]
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Failed to setup invitations table',
      manualSetup: true,
      sql: getCreateTableSQL()
    }, { status: 500 })
  }
}

function getCreateTableSQL() {
  return `-- Create invitations table for team member invitations
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;`
}

export async function GET() {
  return NextResponse.json({ sql: getCreateTableSQL() })
}
