-- Create invitations table for team invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);

-- Add unique constraint to prevent duplicate pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending 
  ON invitations(organization_id, email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON invitations;
CREATE POLICY "Users can view invitations for their organization" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert invitations" ON invitations;
CREATE POLICY "Admins can insert invitations" ON invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;
CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
