import pytest
import json
from unittest.mock import patch, MagicMock
from app import create_app
from app.models.storage import key_pair_store
from app.models.encryption_models import KeyPair
from app.crypto.encryption import EncryptionManager

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_key_pair():
    # Create a mock key pair
    key_id = "key_test_123"
    key = EncryptionManager.generate_key()
    key_b64 = EncryptionManager.key_to_base64(key)
    
    from config import Config
    encrypted_key = EncryptionManager.encrypt_dek(key_b64, Config.MASTER_KEY)

    kp = KeyPair(
        key_id=key_id,
        doctor_id="DR001",
        patient_id="PT001",
        encryption_key=encrypted_key,
        status="Active"
    )
    key_pair_store.create(kp)
    return kp

@patch('app.api.keys.audit_logger')
def test_scan_qr_code_success(mock_audit, client, mock_key_pair):
    """Test successful QR code scanning and verification"""
    
    # Construct valid QR data
    qr_data = {
        'key_id': mock_key_pair.key_id,
        'doctor_id': mock_key_pair.doctor_id,
        'patient_id': mock_key_pair.patient_id
    }
    
    response = client.post('/api/keys/scan', json={
        'qr_data': json.dumps(qr_data)
    })
    
    if response.status_code != 200:
        print(f"Error response: {response.get_json()}")
        
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True

    assert data['connection']['key_id'] == mock_key_pair.key_id

def test_scan_qr_code_invalid_data(client):
    """Test QR scan with invalid data"""
    
    # Missing fields
    qr_data = {
        'key_id': 'some_id'
        # missing doctor/patient id
    }
    
    response = client.post('/api/keys/scan', json={
        'qr_data': json.dumps(qr_data)
    })
    
    assert response.status_code == 400
    assert 'Incomplete QR code data' in response.get_json()['error']

def test_scan_qr_code_mismatch(client, mock_key_pair):
    """Test QR scan with matching key ID but wrong user IDs"""
    
    qr_data = {
        'key_id': mock_key_pair.key_id,
        'doctor_id': 'WRONG_DOCTOR',
        'patient_id': mock_key_pair.patient_id
    }
    
    response = client.post('/api/keys/scan', json={
        'qr_data': json.dumps(qr_data)
    })
    
    assert response.status_code == 403
    assert 'Key pair mismatch' in response.get_json()['error']

#@patch('app.api.files.encrypted_file_store')
#@patch('app.api.files.key_pair_store')
#@patch('app.api.files.supabase')
#@patch('app.api.files.EncryptionManager')
#def test_decryption_failure_notification(mock_encrypt_mgr, mock_supabase, mock_kp_store, mock_file_store, client):
#    """
#    Test that a decryption failure returns a 422 status code (User Story [DR] #17 & [PT] #14)
#    """
#    # Mock file and key retrieval
#    mock_file = MagicMock()
#    mock_file.key_pair_id = "key_123"
#    mock_file.file_path = "test/path"
#    mock_file_store.get.return_value = mock_file
    
#    mock_kp = MagicMock()
#    mock_kp.encryption_key = "some_key"
#    # Set doctor/patient IDs to match the requesting user
#    mock_kp.doctor_id = "user_123" 
#    mock_kp.patient_id = "other_user"
#    mock_kp_store.get.return_value = mock_kp
    
#    # Mock Supabase download
#    mock_supabase.storage.from_.return_value.download.return_value = b"encrypted_content"
#    
#    # FORCE DECRYPTION FAILURE
#    # This is the crucial part: simulate the decryption function raising an error
#    mock_encrypt_mgr.decrypt_file.side_effect = Exception("Auth tag mismatch")
    
#    # Make request
#    response = client.get('/api/files/decrypt/file_123?user_id=user_123')
    
#    # Assertions
#    if response.status_code != 422:
#        print(f"Error response: {response.get_json()}")
        
#    assert response.status_code == 422
#    data = response.get_json()
#    assert data['error'] == 'Decryption failed'
#    assert 'could not be decrypted' in data['message']
