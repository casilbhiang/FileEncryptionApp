from functools import wraps
from flask import request, jsonify

def mock_get_current_user():
    """Mock function - returns a fake user for testing"""
    return {
        'id': 'mock-user-uuid-123',
        'user_id': 'DR001',
        'email': 'doctor@test.com',
        'role': 'doctor',
        'full_name': 'Dr. Test'
    }

def require_auth(f):
    """Mock auth decorator - replace with real one later"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = mock_get_current_user()
        return f(user, *args, **kwargs)
    return decorated_function