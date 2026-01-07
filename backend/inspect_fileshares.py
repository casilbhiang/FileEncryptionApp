
from app import create_app
from app.utils.supabase_client import get_supabase_admin_client

def check_column(column_name):
    app = create_app('development')
    with app.app_context():
        supabase = get_supabase_admin_client()
        try:
            print(f"Testing column '{column_name}'...", end=" ")
            supabase.table('file_shares').select(column_name).limit(1).execute()
            print("✅ EXISTS!")
            return True
        except Exception as e:
            # print(f"❌ {e}")
            print("❌ No")
            return False

if __name__ == "__main__":
    candidates = [
        'shared_by', 'sender_id', 'user_id', 'creator_id', 'active_user', 
        'shared_with', 'recipient_id', 'receiver_id', 'target_user',
        'file_id', 'doc_id', 'patient_id'
    ]
    
    found = []
    print("--- Probing file_shares columns ---")
    for col in candidates:
        if check_column(col):
            found.append(col)
            
    print(f"\nFound columns: {found}")
