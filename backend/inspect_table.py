
from app import create_app
from app.utils.supabase_client import get_supabase_admin_client

def inspect_table():
    print("--- Inspecting doctor_patient_connections ---")
    app = create_app('development')
    
    with app.app_context():
        try:
            supabase = get_supabase_admin_client()
            # Try to select the first row to see columns, or just handle empty
            response = supabase.table('doctor_patient_connections').select('*').limit(1).execute()
            
            if response.data:
                print("✅ Table exists. Sample row keys:")
                print(list(response.data[0].keys()))
            else:
                print("✅ Table exists but is empty.")
                # We can't see columns if empty via simple select in some clients, 
                # but valid query means table exists.
                # Let's try to insert a dummy to see if it fails on columns
                print("Attempting to infer columns from error...")
                try:
                    supabase.table('doctor_patient_connections').insert({
                        'doctor_id': 'test', 
                        'patient_id': 'test'
                    }).execute()
                except Exception as e:
                    print(f"Insert Error (may reveal schema): {e}")

        except Exception as e:
            print(f"❌ Error accessing table: {e}")

if __name__ == "__main__":
    inspect_table()
