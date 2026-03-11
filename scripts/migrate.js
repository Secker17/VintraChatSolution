import pg from 'pg'

const { Client } = pg

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL

if (!POSTGRES_URL) {
  console.error('ERROR: POSTGRES_URL is not set')
  process.exit(1)
}

const client = new Client({
  connectionString: POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
})

const migration = `
-- ============================================================
-- STEP 1: CREATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  settings JSONB DEFAULT '{"primaryColor":"#0066FF","position":"bottom-right","welcomeMessage":"Hi! How can we help you today?","offlineMessage":"We are currently offline.","avatar":null,"showBranding":true,"bubbleIcon":"chat","bubbleSize":"medium","bubbleStyle":"solid","bubbleShadow":true,"bubbleAnimation":"none"}'::jsonb,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  ai_responses_used INTEGER DEFAULT 0,
  conversations_this_month INTEGER DEFAULT 0,
  billing_cycle_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'agent' CHECK (role IN ('owner','admin','agent')),
  status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','away')),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, session_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  handoff_requested BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','pending')),
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor','agent','ai','system')),
  sender_id TEXT,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  welcome_message TEXT DEFAULT 'Hello! I am an AI assistant. How can I help you today?',
  fallback_message TEXT DEFAULT 'I am not sure about that. Let me connect you with a human agent.',
  knowledge_base TEXT DEFAULT '',
  response_style TEXT DEFAULT 'friendly' CHECK (response_style IN ('friendly','professional','casual')),
  auto_respond_when_offline BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, shortcut)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_org ON visitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_widget_key ON organizations(widget_key);

-- ============================================================
-- STEP 2: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Organizations
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON organizations;
CREATE POLICY "Users can view orgs they belong to" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members WHERE team_members.organization_id = organizations.id AND team_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Team members
DROP POLICY IF EXISTS "Team members can view their org team" ON team_members;
CREATE POLICY "Team members can view their org team" ON team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = team_members.organization_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can add team members" ON team_members;
CREATE POLICY "Owners and admins can add team members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = team_members.organization_id AND o.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = team_members.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
  );

DROP POLICY IF EXISTS "Users can update their own team member record" ON team_members;
CREATE POLICY "Users can update their own team member record" ON team_members
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete team members" ON team_members;
CREATE POLICY "Owners can delete team members" ON team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = team_members.organization_id AND o.owner_id = auth.uid())
  );

-- Visitors
DROP POLICY IF EXISTS "Team members can view org visitors" ON visitors;
CREATE POLICY "Team members can view org visitors" ON visitors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = visitors.organization_id AND tm.user_id = auth.uid())
  );

-- Conversations
DROP POLICY IF EXISTS "Team members can view org conversations" ON conversations;
CREATE POLICY "Team members can view org conversations" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = conversations.organization_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Team members can update org conversations" ON conversations;
CREATE POLICY "Team members can update org conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = conversations.organization_id AND tm.user_id = auth.uid())
  );

-- Messages
DROP POLICY IF EXISTS "Team members can view conversation messages" ON messages;
CREATE POLICY "Team members can view conversation messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN team_members tm ON tm.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can send messages" ON messages;
CREATE POLICY "Team members can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN team_members tm ON tm.organization_id = c.organization_id
      WHERE c.id = messages.conversation_id AND tm.user_id = auth.uid()
    )
  );

-- AI Settings
DROP POLICY IF EXISTS "Team members can view AI settings" ON ai_settings;
CREATE POLICY "Team members can view AI settings" ON ai_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = ai_settings.organization_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can update AI settings" ON ai_settings;
CREATE POLICY "Owners and admins can update AI settings" ON ai_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = ai_settings.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
  );

DROP POLICY IF EXISTS "Owners can insert AI settings" ON ai_settings;
CREATE POLICY "Owners can insert AI settings" ON ai_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = ai_settings.organization_id AND o.owner_id = auth.uid())
  );

-- Canned Responses
DROP POLICY IF EXISTS "Team members can view canned responses" ON canned_responses;
CREATE POLICY "Team members can view canned responses" ON canned_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = canned_responses.organization_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can manage canned responses" ON canned_responses;
CREATE POLICY "Owners and admins can manage canned responses" ON canned_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.organization_id = canned_responses.organization_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
  );

-- ============================================================
-- STEP 3: TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'organization_name', split_part(NEW.email, '@', 1) || '''s Organization'),
    NEW.id
  )
  RETURNING id INTO org_id;

  INSERT INTO public.team_members (organization_id, user_id, role, display_name)
  VALUES (
    org_id,
    NEW.id,
    'owner',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.ai_settings (organization_id)
  VALUES (org_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW(), last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.billing_cycle_start + INTERVAL '30 days' < NOW() THEN
    NEW.ai_responses_used := 0;
    NEW.conversations_this_month := 0;
    NEW.billing_cycle_start := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_billing_cycle ON organizations;
CREATE TRIGGER check_billing_cycle
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.reset_monthly_counters();
`

async function run() {
  try {
    await client.connect()
    console.log('Connected to database')
    await client.query(migration)
    console.log('Migration completed successfully')
    console.log('Tables created: organizations, team_members, visitors, conversations, messages, ai_settings, canned_responses')
    console.log('RLS policies enabled')
    console.log('Triggers created')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
