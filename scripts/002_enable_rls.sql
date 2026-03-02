-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view orgs they belong to" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members WHERE team_members.organization_id = organizations.id AND team_members.user_id = auth.uid())
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Team members can view their org team" ON team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = team_members.organization_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can add team members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = team_members.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
    OR
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = team_members.organization_id AND o.owner_id = auth.uid())
  );

CREATE POLICY "Users can update their own team member record" ON team_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Owners can delete team members" ON team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = team_members.organization_id AND o.owner_id = auth.uid())
  );

-- Visitors policies (for authenticated team members to view)
CREATE POLICY "Team members can view org visitors" ON visitors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = visitors.organization_id AND tm.user_id = auth.uid())
  );

-- Conversations policies
CREATE POLICY "Team members can view org conversations" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = conversations.organization_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can update org conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = conversations.organization_id AND tm.user_id = auth.uid())
  );

-- Messages policies
CREATE POLICY "Team members can view conversation messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      JOIN team_members tm ON tm.organization_id = c.organization_id 
      WHERE c.id = messages.conversation_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c 
      JOIN team_members tm ON tm.organization_id = c.organization_id 
      WHERE c.id = messages.conversation_id AND tm.user_id = auth.uid()
    )
  );

-- AI Settings policies
CREATE POLICY "Team members can view AI settings" ON ai_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = ai_settings.organization_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can update AI settings" ON ai_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = ai_settings.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
  );

CREATE POLICY "Owners can insert AI settings" ON ai_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = ai_settings.organization_id AND o.owner_id = auth.uid())
  );

-- Canned Responses policies
CREATE POLICY "Team members can view canned responses" ON canned_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = canned_responses.organization_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can manage canned responses" ON canned_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = canned_responses.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
  );
