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
    def encrypt_file(file_data: bytes, key: bytes) -> tuple[str, str]:
        """
        Encrypt file data using AES-GCM
        Returns: (base64_ciphertext, base64_nonce)
        """
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # GCM standard nonce size
        ciphertext = aesgcm.encrypt(nonce, file_data, None)
        
        return (
            base64.b64encode(ciphertext).decode('utf-8'),
            base64.b64encode(nonce).decode('utf-8')
        )
    
    @staticmethod
    def decrypt_file(ciphertext_b64: str, nonce_b64: str, key: bytes) -> bytes:
        """
        Decrypt file data using AES-GCM
        Returns: decrypted bytes
        Throws: InvalidTag if decryption fails
        """
        aesgcm = AESGCM(key)
        nonce = base64.b64decode(nonce_b64)
        ciphertext = base64.b64decode(ciphertext_b64)
        
        return aesgcm.decrypt(nonce, ciphertext, None)

    @staticmethod
    def generate_key_pair_id() -> str:
        """Generate a unique ID for a key pair"""
        return f"k-{secrets.token_hex(4)}"
