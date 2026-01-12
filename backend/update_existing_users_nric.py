"""
Migration script to add NRIC and DOB to existing users
Run this once to update all existing users in the database
"""
from app.utils.supabase_client import get_supabase_admin_client
from datetime import datetime

def update_existing_users():
    """
    Update all existing users with placeholder NRIC and DOB values
    Admin should update these to real values later
    """
    print("Starting migration to add NRIC and DOB to existing users...")

    try:
        supabase = get_supabase_admin_client()

        # Fetch all users that don't have NRIC
        response = supabase.table('users').select('*').is_('nric', 'null').execute()

        if not response.data:
            print("✅ No users need updating. All users already have NRIC values.")
            return

        users_to_update = response.data
        print(f"Found {len(users_to_update)} users without NRIC")

        updated_count = 0
        for user in users_to_update:
            user_id = user['user_id']
            uuid = user['id']

            # Generate placeholder NRIC based on user_id
            # Format: TEMP_[USER_ID] (e.g., TEMP_PAT001)
            placeholder_nric = f"TEMP_{user_id}"

            # Set placeholder DOB to 1990-01-01
            placeholder_dob = "1990-01-01"

            try:
                # Update user
                update_response = supabase.table('users').update({
                    'nric': placeholder_nric,
                    'date_of_birth': placeholder_dob,
                    'updated_at': datetime.now().isoformat()
                }).eq('id', uuid).execute()

                if update_response.data:
                    print(f"✅ Updated {user_id}: NRIC = {placeholder_nric}, DOB = {placeholder_dob}")
                    updated_count += 1
                else:
                    print(f"❌ Failed to update {user_id}")

            except Exception as e:
                print(f"❌ Error updating {user_id}: {e}")

        print(f"\n{'='*60}")
        print(f"Migration complete!")
        print(f"Updated {updated_count} out of {len(users_to_update)} users")
        print(f"{'='*60}")
        print("\n⚠️  IMPORTANT:")
        print("All users have been assigned TEMPORARY NRIC values.")
        print("Format: TEMP_[USER_ID] (e.g., TEMP_PAT001)")
        print("Default DOB: 1990-01-01")
        print("\nYou MUST update these to real values for each user:")
        print("1. Go to User Management page")
        print("2. Edit each user")
        print("3. Update NRIC and Date of Birth with real values")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    from app import create_app

    # Create Flask app context
    app = create_app('development')

    with app.app_context():
        update_existing_users()
