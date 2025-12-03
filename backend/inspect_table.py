import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

try:
    response = supabase.table('encrypted_files').select("*").limit(1).execute()
    if response.data:
        print("Columns in encrypted_files:")
        print(json.dumps(response.data[0], indent=2))
    else:
        print("Table encrypted_files is empty, cannot verify columns.")
except Exception as e:
    print(f"Error: {e}")
