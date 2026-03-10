#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_SERVICE_KEY;

// Read SQL files
const sqlDir = path.join(__dirname);
const sqlFiles = [
  '001_create_tables.sql',
  '002_enable_rls.sql',
  '003_create_triggers.sql'
];

async function executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`📝 Running ${file}...`);
      await executeSql(sql);
      console.log(`✅ ${file} completed\n`);
    }

    console.log('✨ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
