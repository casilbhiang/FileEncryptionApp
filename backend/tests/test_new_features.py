import pytest
import json
from unittest.mock import patch, MagicMock
from app import create_app
from app.models.encryption_models import KeyPair
from app.crypto.encryption import EncryptionManager

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    # We validly utilize the test client here
    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_key_pair():
    """Create a mock KeyPair object in memory (no DB calls)"""
    key_id = "key_test_mock_123"
    
    # Generate a real key for crypto validity
    key = EncryptionManager.generate_key()
    key_b64 = EncryptionManager.key_to_base64(key)
    
    from config import Config
    # We still rely on Config.MASTER_KEY for logic, assuming it's in env or default
    encrypted_key = EncryptionManager.encrypt_dek(key_b64, Config.MASTER_KEY)

    kp = KeyPair(
        key_id=key_id,
        doctor_id="DR001",
        patient_id="PT001",
        encryption_key=encrypted_key,
        status="Active"
    )
    # DO NOT Save to DB here
    return kp

@patch('app.api.keys.audit_logger')
@patch('app.api.keys.key_pair_store')
@patch('app.utils.supabase_client.get_supabase_admin_client')
def test_scan_qr_code_success(mock_get_supabase, mock_store, mock_audit, client, mock_key_pair):
    """Test successful QR code scanning directly mocking the store"""
    
    # Setup Mocks
    mock_store.get.return_value = mock_key_pair
    
    # Mock Supabase insert for connection record
    mock_supabase_instance = MagicMock()
    mock_get_supabase.return_value = mock_supabase_instance
    mock_supabase_instance.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

    # Construct valid QR data
    qr_data = {
        'key_id': mock_key_pair.key_id,
        'doctor_id': mock_key_pair.doctor_id,
        'patient_id': mock_key_pair.patient_id
    }
    
    response = client.post('/api/keys/scan', json={
        'qr_data': json.dumps(qr_data)
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['connection']['key_id'] == mock_key_pair.key_id
    
    # Verify store was called
    mock_store.get.assert_called_with(mock_key_pair.key_id)

def test_scan_qr_code_invalid_data(client):
    """Test QR scan with invalid data (No mocks needed for validation failure)"""
    
    qr_data = {
        'key_id': 'some_id'
        # missing doctor/patient id
    }
    
    response = client.post('/api/keys/scan', json={
        'qr_data': json.dumps(qr_data)
    })
    
    assert response.status_code == 400
    assert 'Incomplete QR code data' in response.get_json()['error']

@patch('app.api.keys.key_pair_store')
def test_scan_qr_code_mismatch(mock_store, client, mock_key_pair):
    """Test QR scan with matching key ID but wrong user IDs"""
    
    # Setup Mock
    mock_store.get.return_value = mock_key_pair
    
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
