# PLACEHOLDER FOR NOW

def encrypt_file_data(file_data: bytes, encryption_key: bytes) -> dict:
    return {
        'encrypted_data': file_data,
        'iv': 'mock-initialization-vector',
        'auth_tag': 'mock-authentication-tag',
        'algorithm': 'AES-GCM-256'
    }

def decrypt_file_data(encrypted_data: bytes, encryption_key: bytes, iv: str, auth_tag: str) -> bytes:
    return encrypted_data

def get_user_encryption_key(user_id: str) -> bytes:
    return b'mock-encryption-key-32-bytes!!'