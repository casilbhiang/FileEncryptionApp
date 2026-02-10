import os
import base64

def mock_get_user_key(user_id):
    """Mock function - returns a fake encryption key"""
    return base64.b64encode(os.urandom(32))  # 256-bit key

def mock_encrypt_file(file_data, key):
    """Mock encryption - just returns the data as-is for testing"""
    return {
        'encrypted_data': file_data,
        'iv': base64.b64encode(os.urandom(12)).decode('utf-8'),
        'auth_tag': base64.b64encode(os.urandom(16)).decode('utf-8'),
        'key_identifier': 'mock-key-id-123'
    }

def mock_decrypt_file(encrypted_data, key, iv, auth_tag):
    """Mock decryption - just returns the data as-is for testing"""
    return encrypted_data