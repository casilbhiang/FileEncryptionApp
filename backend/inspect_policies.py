
from app import create_app
from app.utils.supabase_client import get_supabase_admin_client

def inspect_policies():
    print("--- Inspecting Policies ---")
    app = create_app('development')
    
    with app.app_context():
        supabase = get_supabase_admin_client()
        
        # Try to guess table columns for file_shares since we can't read pg_policies easily
        print("Checking file_shares columns...")
        try:
            # Try to insert dummy data with various keys to see what fails or works
            # This is a bit hacky but helpful if we can't read schema
            # We expect: id, file_id, owner_id (or shared_by), shared_with (or doctor_id/patient_id)
            pass
        except Exception as e:
            pass
            
        # Actually, let's just use the errors we know.
        # But we can try to Select from file_shares to see keys
        try:
            response = supabase.table('file_shares').select('*').limit(1).execute()
            if response.data:
                print(f"file_shares columns: {list(response.data[0].keys())}")
            else:
                print("file_shares table exists but empty.")
        except Exception as e:
            print(f"Error checking file_shares: {e}")

if __name__ == "__main__":
    inspect_policies()
