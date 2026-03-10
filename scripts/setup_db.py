#!/usr/bin/env python3
import os
import psycopg2
import sys

# Get database connection string
db_url = os.environ.get('POSTGRES_URL_NON_POOLING') or os.environ.get('POSTGRES_URL')

if not db_url:
    print("❌ Error: POSTGRES_URL or POSTGRES_URL_NON_POOLING not set")
    sys.exit(1)

try:
    # Connect to database
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    print("✅ Connected to Supabase database\n")
    
    # List of SQL scripts to run in order
    scripts = [
        '001_create_tables.sql',
        '002_enable_rls.sql',
        '003_create_triggers.sql'
    ]
    
    for script_name in scripts:
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        
        if not os.path.exists(script_path):
            print(f"❌ Script not found: {script_path}")
            sys.exit(1)
        
        print(f"📋 Running {script_name}...")
        
        with open(script_path, 'r') as f:
            sql_content = f.read()
        
        try:
            cursor.execute(sql_content)
            conn.commit()
            print(f"✅ {script_name} completed successfully\n")
        except psycopg2.Error as e:
            print(f"❌ Error in {script_name}:")
            print(f"   {e.pgerror}")
            conn.rollback()
            sys.exit(1)
    
    cursor.close()
    conn.close()
    
    print("✨ Database setup completed successfully!")
    
except psycopg2.OperationalError as e:
    print(f"❌ Connection error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
