
from app import create_app
from app.models.storage import key_pair_store
from app.models.encryption_models import KeyPair
from app.crypto.encryption import EncryptionManager
import datetime

def test_key_persistence():
    print("--- Testing Key Persistence ---")
    app = create_app('development')
    
    with app.app_context():
        # 1. Generate Fake Data
        key_id = "DEBUG-" + EncryptionManager.generate_key_pair_id()
        doctor_id = "DEBUG-DOC"
        patient_id = "DEBUG-PAT"
        
        print(f"Creating mock key pair: {key_id}")
        
        kp = KeyPair(
            key_id=key_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            encryption_key="fake_encrypted_blob",
            status='Active'
        )
        
        # 2. Attempt Persistence
        try:
            key_pair_store.create(kp)
            print("✅ key_pair_store.create() call succeeded.")
        except Exception as e:
            print(f"❌ key_pair_store.create() FAILED: {e}")
            return
            
        # 3. Verify in DB
        print("Verifying in DB...")
        fetched = key_pair_store.get(key_id)
        if fetched:
            print(f"✅ Successfully verified key {fetched.key_id} in table 'key_pairs'.")
            
            # Cleanup
            print("Cleaning up test data...")
            key_pair_store.delete(key_id)
            print("Cleanup complete.")
        else:
            print(f"❌ Failed to find key {key_id} in DB after insertion!")

if __name__ == "__main__":
    test_key_persistence()
