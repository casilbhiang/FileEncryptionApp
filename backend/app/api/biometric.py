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
biometric_bp = Blueprint('biometric', __name__)

# Helper function to get client IP address
def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

# ===== Generate Challenge =====
@biometric_bp.route('/challenge', methods=['POST', 'OPTIONS'])
def generate_challenge():
    if request.method == "OPTIONS":
        return '', 204

    try:
        data = request.get_json()
        user_id = data.get('user_id')
        challenge_type = data.get('type')

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
            'used': False,
            'ip_address': get_client_ip(),
            'user_agent': request.headers.get('User-Agent', 'Unknown')
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

        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        print(f"✗ Challenge error: {e}")
        traceback.print_exc()
        return jsonify({'message': 'Failed to generate challenge', 'error': str(e)}), 500


# ===== Register Biometric Credential =====
@biometric_bp.route('/register', methods=['POST', 'OPTIONS'])
def register_biometric():
    if request.method == "OPTIONS":
        return '', 204

    try:
        data = request.get_json()
        user_id = data.get('user_id')
        credential_id = data.get('credential_id')
        public_key = data.get('public_key')
        device_name = data.get('device_name')

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
            'used': True,
            'used_at': datetime.utcnow().isoformat()
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
            'is_active': True,
            'registration_ip': get_client_ip(),
            'registration_user_agent': request.headers.get('User-Agent', 'Unknown')
        }

        supabase.table('biometric_credentials').insert(credential_data).execute()

        return jsonify({
            'message': 'Biometric credential registered successfully',
            'credential_id': credential_id
        }), 200

    except Exception as e:
        import traceback
        print(f"✗ Registration error: {e}")
        traceback.print_exc()
        return jsonify({'message': 'Failed to register biometric', 'error': str(e)}), 500

# ===== Verify Biometric Authentication =====
@biometric_bp.route('/verify', methods=['POST', 'OPTIONS'])
def verify_biometric():
    if request.method == "OPTIONS":
        return '', 204

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

        # Mark challenge as used
        supabase.table('biometric_challenges').update({
            'used': True,
            'used_at': datetime.utcnow().isoformat()
        }).eq('id', challenge_id).execute()

        # Update credential: increment counter and update last_used
        supabase.table('biometric_credentials').update({
            'last_used': datetime.utcnow().isoformat(),
            'counter': current_counter + 1
        }).eq('credential_id', credential_id).execute()

        # ===== Admin post-biometric (send OTP and return full user info) =====
        user_row = supabase.table('users').select('*').eq('user_id', user_id).execute()

        if user_row.data and user_row.data[0].get('role') == 'admin':
            user = user_row.data[0]

            from app.api.auth import send_otp_for_user
            result = send_otp_for_user(user)

            print(f"OTP sent for admin {user_id}: email_sent={result.get('email_sent')}")

            return jsonify({
                'message': 'Biometric authentication successful. OTP sent.',
                'verified': True,
                'otp_sent': True,
                'success': True,
                'email': user['email'],
                'role': user['role'],
                'is_first_login': user.get('password_reset_required', False),
                'user': {
                    'id': user['id'],
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'role': user['role'],
                    'is_first_login': user.get('password_reset_required', False)
                }
            }), 200

        return jsonify({
            'message': 'Biometric authentication successful',
            'verified': True
        }), 200

    except Exception as e:
        import traceback
        print(f"✗ Verification error: {e}")
        traceback.print_exc()
        return jsonify({'message': 'Biometric verification failed', 'error': str(e)}), 500


# ===== Check if User Has Registered Biometric =====
@biometric_bp.route('/check', methods=['GET', 'OPTIONS'])
def check_biometric():
    if request.method == "OPTIONS":
        return '', 204

    try:
        user_id = request.args.get('user_id')

        if not user_id:
            return jsonify({'message': 'User ID required'}), 400

        # Use Supabase RPC function to check if user has registered biometric
        result = supabase.rpc('has_registered_biometric', {'p_user_id': user_id}).execute()
        has_biometric = result.data if result.data is not None else False

        return jsonify({
            'has_biometric': has_biometric,
            'user_id': user_id
        }), 200

    except Exception as e:
        print(f"✗ Check error: {e}")
        return jsonify({'message': 'Failed to check biometric status', 'error': str(e)}), 500