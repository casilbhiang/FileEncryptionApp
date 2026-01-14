"""
AES-GCM Encryption utilities for medical file encryption
"""
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64
import secrets

class EncryptionManager:
    """Manages AES-GCM encryption and decryption"""
    
    @staticmethod
    def generate_key() -> bytes:
        """Generate a 256-bit AES-GCM key"""
        return AESGCM.generate_key(bit_length=256)
    
    @staticmethod
    def key_to_base64(key: bytes) -> str:
        """Convert key bytes to base64 string for storage/transport"""
        return base64.b64encode(key).decode('utf-8')
    
    @staticmethod
    def base64_to_key(key_str: str) -> bytes:
        """Convert base64 key string back to bytes"""
        return base64.b64decode(key_str)

    @staticmethod
    def generate_key_pair_id() -> str:
        """Generate a unique ID for a key pair"""
        return f"k-{secrets.token_hex(4)}"

    @staticmethod
    def encrypt_dek(dek_b64: str, master_key_hex: str) -> str:
        """
        Encrypt a Data Encryption Key (DEK) using the Master Key
        Returns: base64(nonce + ciphertext)
        """
        if not master_key_hex:
            raise ValueError("Master Key not configured")
            
        master_key = bytes.fromhex(master_key_hex)
        dek_bytes = base64.b64decode(dek_b64)
        
        aesgcm = AESGCM(master_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, dek_bytes, None)
        
        # Bundle nonce + ciphertext
        return base64.b64encode(nonce + ciphertext).decode('utf-8')

    @staticmethod
    def decrypt_dek(encrypted_dek_b64: str, master_key_hex: str) -> str:
        """
        Decrypt a Data Encryption Key (DEK) using the Master Key
        Returns: base64(dek)
        """
        if not master_key_hex:
            raise ValueError("Master Key not configured")
            
        master_key = bytes.fromhex(master_key_hex)
        bundle = base64.b64decode(encrypted_dek_b64)
        
        # Extract nonce (first 12 bytes) and ciphertext
        nonce = bundle[:12]
        ciphertext = bundle[12:]
        
        aesgcm = AESGCM(master_key)
        dek_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        
        return base64.b64encode(dek_bytes).decode('utf-8')
