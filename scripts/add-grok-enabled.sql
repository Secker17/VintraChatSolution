-- Add grok_enabled column to ai_settings table if it doesn't exist
ALTER TABLE ai_settings
ADD COLUMN IF NOT EXISTS grok_enabled BOOLEAN DEFAULT true;

-- Update existing records to have grok_enabled = true
UPDATE ai_settings SET grok_enabled = true WHERE grok_enabled IS NULL;
