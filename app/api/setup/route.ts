import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const admin = createAdminClient()

    // Try to create the organizations table first
    const { error: tableError } = await admin
      .from('organizations')
      .select('id')
      .limit(0)

    if (tableError?.code === 'PGRST116' || tableError?.code === '42P01') {
      // Tables don't exist, create them
      console.log('[v0] Creating database tables...')

      // We'll use individual Supabase API calls to create the schema
      // Since we can't execute raw SQL through the Supabase JS client,
      // we'll need to create a function that can be called via RPC

      // For now, we'll return a message to prompt manual setup
      return NextResponse.json({
        success: false,
        message: 'Please create the database tables using Supabase SQL Editor',
        requiredSQL: SQL_SCHEMA
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Database is already initialized'
    })
  } catch (error) {
    console.error('[v0] Setup check error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Setup check failed',
      },
      { status: 500 }
    )
  }
}

const SQL_SCHEMA = `
-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_key TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  settings JSONB DEFAULT '{"theme":"light","language":"en"}',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  ai_responses_used INTEGER DEFAULT 0,
  conversations_this_month INTEGER DEFAULT 0,
  billing_cycle_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, email)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  ai_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'ai')),
  sender_id UUID,
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4',
  temperature DECIMAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create canned_responses table
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "org_select_by_team" ON public.organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "team_select_by_user" ON public.team_members FOR SELECT USING (
  user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "visitor_select_by_org" ON public.visitors FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "conversation_select_by_org" ON public.conversations FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "message_select_by_conversation" ON public.messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- Create function for handling new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organizations (owner_id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email))
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.team_members (organization_id, user_id, role, display_name)
  SELECT id, new.id, 'owner', COALESCE(new.raw_user_meta_data->>'name', new.email)
  FROM public.organizations WHERE owner_id = new.id
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.ai_settings (organization_id)
  SELECT id FROM public.organizations WHERE owner_id = new.id
  ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
`
