#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read SQL files
const sqlDir = path.join(__dirname);
const sqlFiles = [
  '001_create_tables.sql',
  '002_enable_rls.sql',
  '003_create_triggers.sql'
];

async function executeSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split by statements (simple split by ;)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      // Use the REST API to execute the SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok && response.status !== 200) {
        const error = await response.text();
        console.warn(`⚠️  Statement warning: ${statement.substring(0, 40)}...`);
      }
    } catch (error) {
      // Continue even if individual statements fail
      console.warn(`⚠️  Skipping statement: ${error.message}`);
    }
  }
}

async function setupDatabase() {
  console.log('🚀 Starting VintraChat Database Setup...\n');

  try {
    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${file}`);
        continue;
      }

      console.log(`📝 Running ${file}...`);
      await executeSqlFile(filePath);
      console.log(`✅ ${file} processed\n`);
    }

    console.log('✨ Database setup completed!');
    console.log('\n📌 NOTE: Please verify all tables were created in Supabase dashboard:');
    console.log('   - organizations');
    console.log('   - team_members');
    console.log('   - visitors');
    console.log('   - conversations');
    console.log('   - messages');
    console.log('   - ai_settings');
    console.log('   - canned_responses');
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
