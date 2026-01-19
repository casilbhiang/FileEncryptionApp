import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_SERVICE_KEY:
    print("❌ Critical: SUPABASE_SERVICE_KEY not found in .env")
    exit(1)

print(f"Connecting to Supabase: {SUPABASE_URL}")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Test Data
TEST_PATIENT_ID = "DEBUG_PT_001"
TEST_FILENAME = "debug_patient_upload.txt"
TEST_CONTENT = b"This is a test file content for patient upload debugging."

print(f"\n--- Testing Patient Upload (ID: {TEST_PATIENT_ID}) ---")

# 1. Test Storage Upload
print("\n1. Testing Storage Upload...")
try:
    storage_path = f"{TEST_PATIENT_ID}/{TEST_FILENAME}"
    res = supabase.storage.from_('encrypted-files').upload(
        path=storage_path,
        file=TEST_CONTENT,
        file_options={"content-type": "text/plain", "upsert": "true"}
    )
    print(f"✅ Storage Upload Success: {res}")
except Exception as e:
    print(f"❌ Storage Upload Failed: {e}")

# 2. Test Database Insert
print("\n2. Testing Database Insert...")
try:
    file_record = {
        'owner_id': TEST_PATIENT_ID,
        'original_filename': TEST_FILENAME,
        'encrypted_filename': TEST_FILENAME + ".enc",
        'file_size': len(TEST_CONTENT),
        'mime_type': 'text/plain',
        'file_extension': '.txt',
        'encryption_metadata': {'iv': 'test', 'authTag': 'test'},
        'storage_bucket': 'encrypted-files',
        'storage_path': storage_path,
        'upload_status': 'pending'
    }
    
    print(f"Inserting record: {file_record}")
    
    data = supabase.table('encrypted_files').insert(file_record).execute()
    print(f"✅ Database Insert Success: {data}")

except Exception as e:
    print(f"❌ Database Insert Failed: {e}")

print("\n--- End Debug ---")
