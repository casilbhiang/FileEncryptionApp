"""
Data models for encryption system
"""
from datetime import datetime
from typing import Optional

class KeyPair:
    """Represents an encryption key pair between doctor and patient"""
    
    def __init__(
        self, 
        key_id: str, 
        doctor_id: str, 
        patient_id: str, 
        encryption_key: str,
        status: str = 'Active',
        created_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None
    ):
        self.key_id = key_id
        self.doctor_id = doctor_id
        self.patient_id = patient_id
        self.encryption_key = encryption_key  # Base64 encoded
        self.status = status  # Active, Inactive, Revoked
        self.created_at = created_at or datetime.utcnow()
        self.expires_at = expires_at

    def to_dict(self):
        """Convert to dictionary for API response (excluding key)"""
        return {
            'key_id': self.key_id,
            'doctor_id': self.doctor_id,
            'patient_id': self.patient_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

    def to_dict_with_key(self):
        """Convert to dictionary including the key (use carefully)"""
        data = self.to_dict()
        data['encryption_key'] = self.encryption_key
        return data

    @classmethod
    def from_dict(cls, data):
        """Create KeyPair from dictionary"""
        return cls(
            key_id=data['key_id'],
            doctor_id=data['doctor_id'],
            patient_id=data['patient_id'],
            encryption_key=data['encryption_key'],
            status=data.get('status', 'Active'),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None,
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None
        )


class EncryptedFile:
    """Represents metadata for an encrypted file"""
    
    def __init__(
        self,
        file_id: str,
        filename: str,
        owner_id: str,
        owner_uuid: str,
        key_pair_id: str,
        ciphertext: str,
        nonce: str,
        file_size: int,
        mime_type: str,
        cloud_storage_path: Optional[str] = None,
        uploaded_at: Optional[datetime] = None
    ):
        self.file_id = file_id
        self.filename = filename
        self.owner_id = owner_id
        self.owner_uuid = owner_uuid
        self.key_pair_id = key_pair_id
        self.ciphertext = ciphertext  # Base64 encoded
        self.nonce = nonce  # Base64 encoded
        self.file_size = file_size
        self.mime_type = mime_type
        self.cloud_storage_path = cloud_storage_path
        self.uploaded_at = uploaded_at or datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'file_id': self.file_id,
            'filename': self.filename,
            'owner_id': self.owner_id,
            'owner_uuid': self.owner_uuid,
            'key_pair_id': self.key_pair_id,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'cloud_storage_path': self.cloud_storage_path,
            'uploaded_at': self.uploaded_at.isoformat()
        }
