"""
Test script to verify Supabase connection
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

print("Testing Supabase Connection...")
print(f"SUPABASE_URL: {SUPABASE_URL[:30]}..." if SUPABASE_URL else "SUPABASE_URL: Not set")
print(f"SUPABASE_SERVICE_KEY: {'Set ✓' if SUPABASE_SERVICE_KEY else 'Not set ✗'}")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("\n❌ ERROR: Supabase credentials not found in .env file")
    exit(1)

try:
    # Initialize Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("\n✓ Supabase client initialized successfully")
    
    # Test connection by listing buckets
    try:
        buckets = supabase.storage.list_buckets()
        print(f"\n✓ Successfully connected to Supabase!")
        print(f"  Found {len(buckets)} storage bucket(s):")
        for bucket in buckets:
            print(f"    - {bucket.name} (ID: {bucket.id})")
        
        # Check if encrypted-files bucket exists
        bucket_names = [b.name for b in buckets]
        if 'encrypted-files' in bucket_names:
            print("\n✓ 'encrypted-files' bucket exists")
        else:
            print("\n⚠ WARNING: 'encrypted-files' bucket not found")
            print("  You may need to create it in the Supabase dashboard")
            
    except Exception as e:
        print(f"\n❌ Error accessing storage: {e}")
        
except Exception as e:
    print(f"\n❌ Failed to connect to Supabase: {e}")
    exit(1)

print("\n✓ Supabase connection test completed successfully!")
