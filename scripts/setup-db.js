import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runScript(scriptName) {
  console.log(`\n📋 Running ${scriptName}...`);
  const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
  const sql = fs.readFileSync(scriptPath, 'utf-8');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.error(`❌ Error in ${scriptName}:`, error.message);
      return false;
    }
    
    console.log(`✅ ${scriptName} completed successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Error executing ${scriptName}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database setup...\n');
  
  const scripts = [
    '001_create_tables.sql',
    '002_enable_rls.sql',
    '003_create_triggers.sql'
  ];

  for (const script of scripts) {
    const success = await runScript(script);
    if (!success) {
      console.error(`\n⚠️ Setup failed at ${script}`);
      process.exit(1);
    }
  }

  console.log('\n✨ Database setup completed successfully!');
}

main();
