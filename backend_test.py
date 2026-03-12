#!/usr/bin/env python3

"""
Backend Testing for VintraChat - Next.js + Supabase App
Tests Supabase connection and authentication endpoints
"""

import requests
import sys
import json
import os
from datetime import datetime

class SupabaseAPITester:
    def __init__(self, base_url="https://bae66df3-b886-4468-88bb-29f598f27694.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.supabase_url = "https://ydkonmnrndsvfewkozki.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlka29ubW5ybmRzdmZld2tvemtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTYyOTYsImV4cCI6MjA4NjI5MjI5Nn0.7SM6r8oYaRLem0Y55PPsCBSIkIBd6KwzZFA_IvPg0do"
        self.tests_run = 0
        self.tests_passed = 0
        self.issues = []

    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            result = test_func()
            if result:
                self.tests_passed += 1
                print(f"✅ Passed - {name}")
                return True
            else:
                print(f"❌ Failed - {name}")
                self.issues.append(f"Failed: {name}")
                return False
        except Exception as e:
            print(f"❌ Failed - {name}: {str(e)}")
            self.issues.append(f"Error in {name}: {str(e)}")
            return False

    def test_app_accessibility(self):
        """Test if the app is accessible"""
        try:
            response = requests.get(self.base_url, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"App not accessible: {e}")
            return False

    def test_login_page_loads(self):
        """Test if login page loads"""
        try:
            response = requests.get(f"{self.base_url}/auth/login", timeout=10)
            return response.status_code == 200 and "VintraChat" in response.text
        except Exception as e:
            print(f"Login page not loading: {e}")
            return False

    def test_dashboard_redirects_unauthorized(self):
        """Test if dashboard redirects unauthorized users"""
        try:
            response = requests.get(f"{self.base_url}/dashboard", timeout=10, allow_redirects=True)
            # Should redirect to login page
            return response.status_code == 200 and "Welcome back" in response.text
        except Exception as e:
            print(f"Dashboard redirect test failed: {e}")
            return False

    def test_admin_page_loads(self):
        """Test if admin page loads (will show auth check)"""
        try:
            response = requests.get(f"{self.base_url}/admin", timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Admin page not loading: {e}")
            return False

    def test_supabase_connection(self):
        """Test Supabase REST API connection"""
        try:
            headers = {
                'apikey': self.supabase_key,
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/json'
            }
            
            # Test a simple REST endpoint
            response = requests.get(
                f"{self.supabase_url}/rest/v1/",
                headers=headers,
                timeout=10
            )
            return response.status_code in [200, 404]  # 404 is ok for root endpoint
        except Exception as e:
            print(f"Supabase connection failed: {e}")
            return False

    def test_sign_up_page_loads(self):
        """Test if sign up page loads"""
        try:
            response = requests.get(f"{self.base_url}/auth/sign-up", timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Sign up page not loading: {e}")
            return False

def main():
    print("🚀 Starting VintraChat Backend Tests")
    print("=" * 50)
    
    tester = SupabaseAPITester()
    
    # Run core connectivity tests
    tests = [
        ("App Accessibility", tester.test_app_accessibility),
        ("Login Page Loads", tester.test_login_page_loads),  
        ("Sign Up Page Loads", tester.test_sign_up_page_loads),
        ("Dashboard Auth Protection", tester.test_dashboard_redirects_unauthorized),
        ("Admin Page Loads", tester.test_admin_page_loads),
        ("Supabase Connection", tester.test_supabase_connection),
    ]
    
    for test_name, test_func in tests:
        tester.run_test(test_name, test_func)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests Summary: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.issues:
        print("\n❌ Issues Found:")
        for issue in tester.issues:
            print(f"  - {issue}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())