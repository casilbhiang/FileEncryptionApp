
import sys
import os
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.getcwd())

from app.utils.audit import audit_logger, AuditAction, AuditResult
from config import Config

from app import create_app

def test_audit_log():
    print("--- Testing Audit Log Insertion ---")
    
    app = create_app('development')
    
    with app.app_context():
        print(f"SUPABASE_URL: {app.config.get('SUPABASE_URL')}")
        print(f"Testing insertion of KEY_GENERATE event...")
        
        try:
            # Simulate what keys.py does
            log_entry = audit_logger.log(
                user_id="ADMIN",
                user_name="System Admin",
                action=AuditAction.KEY_GENERATE,
                target="TEST_DR -> TEST_PT",
                result=AuditResult.OK,
                details="Manual verification test"
            )
            
            if log_entry:
                print("✅ SUCCESS: Audit log inserted.")
                print(f"   ID: {log_entry.id}")
                print(f"   Action: {log_entry.action}")
            else:
                print("❌ FAILURE: Audit log returned None (check previous error logs).")
            
            # --- VERIFY FETCH ---
            print("\n--- Verifying Fetch ---")
            from app.utils.supabase_client import get_supabase_admin_client
            supabase = get_supabase_admin_client()
            
            # Mimic the API query
            response = supabase.table('audit_logs').select('*, users(user_id, full_name, email, role)').order('created_at', desc=True).limit(5).execute()
            
            print(f"Fetched {len(response.data)} logs.")
            for log in response.data:
                print(f" - [{log.get('action')}] Target: {log.get('target')} | UserID: {log.get('user_id')}")
                
        except Exception as e:
            print(f"❌ EXCEPTION: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_audit_log()
