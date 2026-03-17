-- Migration: Add grok_enabled and website_url to ai_settings table

ALTER TABLE ai_settings
ADD COLUMN IF NOT EXISTS grok_enabled BOOLEAN DEFAULT true;

ALTER TABLE ai_settings
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_settings_org ON ai_settings(organization_id);
