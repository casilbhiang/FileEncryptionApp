from flask import Blueprint, request, jsonify
import secrets
import base64
import os
from datetime import datetime, timedelta 
from supabase import create_client

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Initialize Supabase
if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Blueprint for biometric routes
biometric_bp = Blueprint('biometric', __name__, url_prefix='/api/auth/biometric')

# Helper function to get client IP address
def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

# ===== Generate Challenge =====
@biometric_bp.route('/challenge', methods=['POST'])
def generate_challenge():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        challenge_type = data.get('type')  # 'registration' or 'authentication'
        
        if not user_id or not challenge_type:
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Generate random challenge (32 bytes)
        challenge = secrets.token_bytes(32)
        challenge_b64 = base64.b64encode(challenge).decode('utf-8')
        
        # Store challenge in Supabase
        challenge_data = {
            'user_id': user_id,
            'challenge': challenge_b64,
            'challenge_type': challenge_type,
            'used': False
        }
        
        supabase.table('biometric_challenges').insert(challenge_data).execute()
        
        response_data = {
            'challenge': challenge_b64
        }
        
        # For authentication, also return registered credential IDs
        if challenge_type == 'authentication':
            result = supabase.rpc('get_user_credential_ids', {'p_user_id': user_id}).execute()
            credential_ids = [row['credential_id'] for row in result.data] if result.data else []
            response_data['credential_ids'] = credential_ids
            
            if not credential_ids:
                return jsonify({'message': 'No biometric credentials registered for this user'}), 404
        
        print(f"Challenge generated for user {user_id}, type: {challenge_type}")
        return jsonify(response_data), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Challenge generation error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'message': 'Failed to generate challenge', 'error': str(e)}), 500

# ===== Register Biometric Credential =====
@biometric_bp.route('/register', methods=['POST'])
def register_biometric():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        credential_id = data.get('credential_id')
        public_key = data.get('public_key')
        device_name = data.get('device_name')
        attestation_object = data.get('attestation_object')
        client_data_json = data.get('client_data_json')
        
        if not all([user_id, credential_id, public_key, device_name]):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Verify challenge was requested and is still valid
        challenge_result = supabase.table('biometric_challenges').select('*').eq(
            'user_id', user_id
        ).eq(
            'challenge_type', 'registration'
        ).eq(
            'used', False
        ).gt(
            'expires_at', datetime.utcnow().isoformat()
        ).order('created_at', desc=True).limit(1).execute()
        
        if not challenge_result.data:
            return jsonify({'message': 'No active registration challenge found or challenge expired'}), 400
        
        challenge_id = challenge_result.data[0]['id']
        
        # Mark challenge as used
        supabase.table('biometric_challenges').update({
            'used': True
        }).eq('id', challenge_id).execute()
        
        # Check if credential already exists
        existing = supabase.table('biometric_credentials').select('id').eq(
            'credential_id', credential_id
        ).execute()
        
        if existing.data:
            return jsonify({'message': 'Credential already registered'}), 409
        
        # Store credential in Supabase
        credential_data = {
            'user_id': user_id,
            'credential_id': credential_id,
            'public_key': public_key,
            'device_name': device_name,
            'counter': 0,
            'is_active': True
        }
        
        result = supabase.table('biometric_credentials').insert(credential_data).execute()
        
        print(f"Biometric registered for user {user_id} on {device_name}")
        
        return jsonify({
            'message': 'Biometric credential registered successfully',
            'credential_id': credential_id
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Registration error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'message': 'Failed to register biometric', 'error': str(e)}), 500

# ===== Verify Biometric Authentication =====
@biometric_bp.route('/verify', methods=['POST'])
def verify_biometric():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        credential_id = data.get('credential_id')
        authenticator_data = data.get('authenticator_data')
        client_data_json = data.get('client_data_json')
        signature = data.get('signature')
        
        if not all([user_id, credential_id, authenticator_data, client_data_json, signature]):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Verify challenge exists and is valid
        challenge_result = supabase.table('biometric_challenges').select('*').eq(
            'user_id', user_id
        ).eq(
            'challenge_type', 'authentication'
        ).eq(
            'used', False
        ).gt(
            'expires_at', datetime.utcnow().isoformat()
        ).order('created_at', desc=True).limit(1).execute()
        
        if not challenge_result.data:
            return jsonify({'message': 'No active authentication challenge found or challenge expired'}), 400
        
        challenge_id = challenge_result.data[0]['id']
        
        # Get credential from database
        credential_result = supabase.table('biometric_credentials').select('*').eq(
            'credential_id', credential_id
        ).eq(
            'user_id', user_id
        ).eq(
            'is_active', True
        ).execute()
        
        if not credential_result.data:
            return jsonify({'message': 'Credential not found or inactive'}), 404
        
        credential = credential_result.data[0]
        current_counter = credential['counter']
        
        print(f"Biometric authentication verified for user {user_id}")
        
        # Mark challenge as used
        supabase.table('biometric_challenges').update({
            'used': True
        }).eq('id', challenge_id).execute()
        
        # Update credential: increment counter and update last_used
        supabase.table('biometric_credentials').update({
            'last_used': datetime.utcnow().isoformat(),
            'counter': current_counter + 1
        }).eq('credential_id', credential_id).execute()
        
        return jsonify({
            'message': 'Biometric authentication successful',
            'verified': True
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Verification error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'message': 'Biometric verification failed', 'error': str(e)}), 500

# ===== Check if User Has Registered Biometric =====
@biometric_bp.route('/check', methods=['GET'])
def check_biometric():
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'message': 'User ID required'}), 400
    
        # Use Supabase RPC function to check if user has registered biometric
        result = supabase.rpc('has_registered_biometric', {'p_user_id': user_id}).execute()
        has_biometric = result.data if result.data is not None else False
        
        print(f"Biometric check for user {user_id}: {has_biometric}")
        
        return jsonify({
            'has_biometric': has_biometric,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Check error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'message': 'Failed to check biometric status', 'error': str(e)}), 500