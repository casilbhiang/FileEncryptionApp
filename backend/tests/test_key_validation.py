
import pytest
from unittest.mock import MagicMock, patch
from app import create_app

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SUPABASE_URL": "https://dummy.supabase.co",
        "SUPABASE_KEY": "dummy",
        "SUPABASE_SERVICE_KEY": "dummy",
    })
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_supabase():
    with patch('app.utils.supabase_client.get_supabase_admin_client') as mock:
        yield mock

def test_generate_key_missing_fields(client):
    """Test key generation with missing fields"""
    response = client.post('/api/keys/generate', json={})
    assert response.status_code == 400
    assert b"doctor_id and patient_id are required" in response.data

def test_generate_key_doctor_not_found(client, mock_supabase):
    """Test key generation when doctor does not exist"""
    # Mock doctor query returning empty list
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client

    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    response = client.post('/api/keys/generate', json={
        "doctor_id": "MISSING_DOC",
        "patient_id": "PAT001"
    })
    
    assert response.status_code == 404
    assert b"Doctor with ID MISSING_DOC not found" in response.data

def test_generate_key_patient_not_found(client, mock_supabase):
    """Test key generation when patient does not exist"""
    # Mock doctor query returning success, but patient query returning empty
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client

    mock_execute = MagicMock()
    mock_execute.side_effect = [
        MagicMock(data=[{'user_id': 'DOC001', 'role': 'doctor'}]), # Doctor found
        MagicMock(data=[])                                        # Patient not found
    ]
    
    mock_client.table.return_value.select.return_value.eq.return_value.execute = mock_execute

    response = client.post('/api/keys/generate', json={
        "doctor_id": "DOC001",
        "patient_id": "MISSING_PAT"
    })
    
    assert response.status_code == 404
    assert b"Patient with ID MISSING_PAT not found" in response.data

def test_generate_key_success(client, mock_supabase):
    """Test successful key generation (mocking DB entirely)"""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client

    # Mock users existing with correct roles
    mock_execute_users = MagicMock()
    mock_execute_users.side_effect = [
        MagicMock(data=[{'user_id': 'DOC001', 'role': 'doctor'}]), # Doctor check
        MagicMock(data=[{'user_id': 'PAT001', 'role': 'patient'}])  # Patient check
    ]
    mock_client.table.return_value.select.return_value.eq.return_value.execute = mock_execute_users

    with patch('app.api.keys.key_pair_store') as mock_store:
        mock_store.get_by_users.return_value = None # No existing key
        mock_store.create.return_value = None # Create success
            
        with patch('config.Config') as MockConfig:
            MockConfig.MASTER_KEY = "0" * 64 # 32 bytes hex
            
            response = client.post('/api/keys/generate', json={
                "doctor_id": "DOC001",
                "patient_id": "PAT001"
            })
            
            if response.status_code != 201:
                print(response.data)
            
            assert response.status_code == 201
            assert response.json['success'] is True
