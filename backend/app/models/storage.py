"""
Supabase storage/repository for key pairs and encrypted files
"""
from typing import Dict, List, Optional
from app.models.encryption_models import KeyPair, EncryptedFile
from app.utils.supabase_client import get_supabase_admin_client

class KeyPairStore:
    """Supabase store for encryption key pairs"""
    
    def __init__(self):
        # We don't need local storage anymore
        pass
    
    @property
    def supabase(self):
        return get_supabase_admin_client()

    def create(self, key_pair: KeyPair) -> KeyPair:
        """Create a new key pair"""
        data = key_pair.to_dict_with_key()
        
        response = self.supabase.table('key_pairs').insert(data).execute()
        # If successful, return the object.
        return key_pair
    
    def get(self, key_id: str) -> Optional[KeyPair]:
        """Get a key pair by ID"""
        response = self.supabase.table('key_pairs').select('*').eq('key_id', key_id).execute()
        if response.data:
            return KeyPair.from_dict(response.data[0])
        return None
    
    def get_by_users(self, doctor_id: str, patient_id: str) -> Optional[KeyPair]:
        """Get active key pair for doctor-patient combination"""
        response = self.supabase.table('key_pairs')\
            .select('*')\
            .eq('doctor_id', doctor_id)\
            .eq('patient_id', patient_id)\
            .eq('status', 'Active')\
            .execute()
            
        if response.data:
            return KeyPair.from_dict(response.data[0])
        return None
    
    def list_all(self) -> List[KeyPair]:
        """List all key pairs"""
        response = self.supabase.table('key_pairs').select('*').execute()
        return [KeyPair.from_dict(kp) for kp in response.data]
    
    def list_by_user(self, user_id: str) -> List[KeyPair]:
        """List all key pairs for a user (as doctor or patient)"""
        response = self.supabase.table('key_pairs')\
            .select('*')\
            .or_(f"doctor_id.eq.{user_id},patient_id.eq.{user_id}")\
            .execute()
            
        return [KeyPair.from_dict(kp) for kp in response.data]
    
    def update_status(self, key_id: str, status: str) -> Optional[KeyPair]:
        """Update key pair status"""
        response = self.supabase.table('key_pairs')\
            .update({'status': status})\
            .eq('key_id', key_id)\
            .execute()
            
        if response.data:
            return KeyPair.from_dict(response.data[0])
        return None
    
    def delete(self, key_id: str) -> bool:
        """Delete a key pair"""
        response = self.supabase.table('key_pairs').delete().eq('key_id', key_id).execute()
        # response.data will contain the deleted row(s)
        return len(response.data) > 0

class EncryptedFileStore:
    """Supabase store for encrypted files (Wrapper)"""

    @property
    def supabase(self):
        return get_supabase_admin_client()
    
    def create(self, encrypted_file: EncryptedFile) -> EncryptedFile:
        data = encrypted_file.to_dict()
        self.supabase.table('encrypted_files').insert(data).execute()
        return encrypted_file
    
    def get(self, file_id: str) -> Optional[EncryptedFile]:
        response = self.supabase.table('encrypted_files').select('*').eq('id', file_id).execute()
        if response.data:
            return EncryptedFile.from_dict(response.data[0])
        return None
    

# Global instances
key_pair_store = KeyPairStore()
encrypted_file_store = EncryptedFileStore()
