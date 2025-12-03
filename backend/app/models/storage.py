"""
In-memory storage for key pairs and encrypted files
(In production, this should use a proper database like PostgreSQL/Supabase)
"""
from typing import Dict, List, Optional
from app.models.encryption_models import KeyPair, EncryptedFile


class KeyPairStore:
    """In-memory store for encryption key pairs"""
    
    def __init__(self):
        self._store: Dict[str, KeyPair] = {}
    
    def create(self, key_pair: KeyPair) -> KeyPair:
        """Create a new key pair"""
        self._store[key_pair.key_id] = key_pair
        return key_pair
    
    def get(self, key_id: str) -> Optional[KeyPair]:
        """Get a key pair by ID"""
        return self._store.get(key_id)
    
    def get_by_users(self, doctor_id: str, patient_id: str) -> Optional[KeyPair]:
        """Get active key pair for doctor-patient combination"""
        for kp in self._store.values():
            if (kp.doctor_id == doctor_id and 
                kp.patient_id == patient_id and 
                kp.status == 'Active'):
                return kp
        return None
    
    def list_all(self) -> List[KeyPair]:
        """List all key pairs"""
        return list(self._store.values())
    
    def list_by_user(self, user_id: str) -> List[KeyPair]:
        """List all key pairs for a user (as doctor or patient)"""
        return [
            kp for kp in self._store.values()
            if kp.doctor_id == user_id or kp.patient_id == user_id
        ]
    
    def update_status(self, key_id: str, status: str) -> Optional[KeyPair]:
        """Update key pair status"""
        kp = self._store.get(key_id)
        if kp:
            kp.status = status
        return kp
    
    def delete(self, key_id: str) -> bool:
        """Delete a key pair"""
        if key_id in self._store:
            del self._store[key_id]
            return True
        return False


class EncryptedFileStore:
    """In-memory store for encrypted files"""
    
    def __init__(self):
        self._store: Dict[str, EncryptedFile] = {}
    
    def create(self, encrypted_file: EncryptedFile) -> EncryptedFile:
        """Create a new encrypted file record"""
        self._store[encrypted_file.file_id] = encrypted_file
        return encrypted_file
    
    def get(self, file_id: str) -> Optional[EncryptedFile]:
        """Get an encrypted file by ID"""
        return self._store.get(file_id)
    
    def list_by_owner(self, owner_id: str) -> List[EncryptedFile]:
        """List all files owned by a user"""
        return [
            f for f in self._store.values()
            if f.owner_id == owner_id
        ]
    
    def list_by_key_pair(self, key_pair_id: str) -> List[EncryptedFile]:
        """List all files encrypted with a specific key pair"""
        return [
            f for f in self._store.values()
            if f.key_pair_id == key_pair_id
        ]
    
    def delete(self, file_id: str) -> bool:
        """Delete an encrypted file record"""
        if file_id in self._store:
            del self._store[file_id]
            return True
        return False


# Global instances (in production, use dependency injection)
key_pair_store = KeyPairStore()
encrypted_file_store = EncryptedFileStore()
