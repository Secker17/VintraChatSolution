-- Trigger to create organization and team member after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create a default organization for the new user
  INSERT INTO public.organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'organization_name', NEW.email || '''s Organization'),
    NEW.id
  )
  RETURNING id INTO org_id;

  -- Add the user as owner team member
  INSERT INTO public.team_members (organization_id, user_id, role, display_name)
  VALUES (
    org_id,
    NEW.id,
    'owner',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );

  -- Create default AI settings for the organization
  INSERT INTO public.ai_settings (organization_id)
  VALUES (org_id);

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update conversation updated_at on new message
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
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Function to reset monthly counters
CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if billing cycle should reset (30 days)
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
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_counters();
