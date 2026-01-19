
from app import create_app
from app.utils.supabase_client import get_supabase_admin_client

def debug_columns():
    print("--- Debugging Column Types ---")
    app = create_app('development')
    
    with app.app_context():
        supabase = get_supabase_admin_client()
        
        # Test 1: Insert TEXT ID into doctor_patient_connections
        print("\n1. Testing doctor_patient_connections (Expect 'test_id' failure if UUID)...")
        try:
            supabase.table('doctor_patient_connections').insert({
                'doctor_id': 'test_string_id', 
                'patient_id': 'test_string_id'
            }).execute()
            print("   ✅ Inserted 'test_string_id'. Column allows TEXT.")
        except Exception as e:
            print(f"Insert Failed: {e}")

        # Test 2: Insert TEXT ID into encrypted_files
        print("\n2. Testing encrypted_files (Expect 'test_id' failure if UUID)...")
        try:
            # Minimal insert
            supabase.table('encrypted_files').insert({
                'owner_id': 'test_string_id',
                'original_filename': 'debug_test.txt',
                'encrypted_filename': 'debug_test.txt.enc', 
                'file_size': 0
            }).execute()
            print("Inserted 'test_string_id'. Column allows TEXT.")
        except Exception as e:
            print(f"Insert Failed: {e}")

if __name__ == "__main__":
    debug_columns()
