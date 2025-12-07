import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

email = "doctor_test_123@example.com"
password = "password123"

print(f"Creating auth user {email}...")

try:
    # Try to create user as admin (requires service role key)
    print("Attempting admin create_user...")
    try:
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user = res.user
    except Exception as e:
        print(f"Admin create failed (maybe user exists?): {e}")
        # Try to list users to find it
        users = supabase.auth.admin.list_users()
        user = next((u for u in users if u.email == email), None)

    if user:
        user_id = user.id
        print(f"✅ Auth user obtained. ID: {user_id}")
        
        # Now check if user exists in public.users
        print("Checking public.users...")
        existing = supabase.table("users").select("*").eq("id", user_id).execute()
        
        data = {
            "id": user_id,
            "user_id": "DR001",
            "email": email,
            "role": "doctor",
            "full_name": "Test Doctor",
            "is_active": True,
            "password_hash": "dummy_hash"
        }
        
        if existing.data:
            print("User exists in public.users, updating...")
            supabase.table("users").update(data).eq("id", user_id).execute()
        else:
            print("User not in public.users, inserting...")
            supabase.table("users").insert(data).execute()
            
        print("✅ User synced to public.users successfully!")
        
        # IMPORTANT: We need to update the backend code to use this new User ID
        print(f"\n⚠️  IMPORTANT: You must update 'backend/app/api/files.py' to use this User ID: {user_id}")
        
    else:
        print("❌ Failed to get auth user.")

except Exception as e:
    print(f"❌ Error: {e}")
