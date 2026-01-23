
from app import create_app
from app.utils.supabase_client import get_supabase_admin_client

def inspect_key_tables():
    print("--- Inspecting Key Tables ---")
    app = create_app('development')
    
    with app.app_context():
        supabase = get_supabase_admin_client()
        
        tables_to_check = ['key_pairs', 'encrypted_keys', 'keys']
        
        for table in tables_to_check:
            print(f"\nChecking table: '{table}'...")
            try:
                # Limit 1 to check existence
                response = supabase.table(table).select('*').limit(1).execute()
                print(f"✅ Table '{table}' EXISTS.")
                if response.data:
                    print(f"   Sample keys: {list(response.data[0].keys())}")
                else:
                    print("   Table is empty.")
            except Exception as e:
                print(f"❌ Table '{table}' access failed: {e}")

if __name__ == "__main__":
    inspect_key_tables()
