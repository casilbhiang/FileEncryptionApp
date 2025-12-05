"""
Authentication API endpoints
Handles login, OTP verification, password reset, etc.
"""
from flask import Blueprint, request, jsonify
from app.utils.supabase_client import get_supabase_admin_client
from app.utils.email_sender import send_otp_email
import secrets
import hashlib
import sys
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

# Temporary storage for OTP codes (in production, use Redis or database)
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP code"""
    return str(secrets.randbelow(1000000)).zfill(6)

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Handle user login
    POST /api/auth/login
    Body: { "role": "admin|doctor|patient", "userId": "ADM001", "password": "password" }
    """
    try:
        data = request.get_json()
        role = data.get('role')
        user_id = data.get('userId')
        password = data.get('password')

        # Validate input
        if not role or not user_id or not password:
            return jsonify({
                'success': False,
                'message': 'Role, User ID, and password are required'
            }), 400

        # Get Supabase admin client
        supabase = get_supabase_admin_client()

        # Query user from database
        response = supabase.table('users').select('*').eq('user_id', user_id).eq('role', role).execute()

        if not response.data or len(response.data) == 0:
            # Log failed login attempt
            try:
                supabase.rpc('log_auth_event', {
                    'p_user_id': None,
                    'p_event_type': 'login_failed',
                    'p_email': None,
                    'p_error_message': 'Invalid user ID or role',
                    'p_metadata': {'user_id': user_id, 'role': role}
                }).execute()
            except:
                pass

            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        user = response.data[0]

        # Check if user is active
        if not user.get('is_active', False):
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact administrator.'
            }), 403

        # Verify password by comparing hashes
        stored_password_hash = user.get('password_hash')

        if not stored_password_hash:
            return jsonify({
                'success': False,
                'message': 'Account not properly configured. Please contact administrator.'
            }), 500

        # Hash the provided password
        provided_password_hash = hash_password(password)

        # Compare password hashes
        if provided_password_hash != stored_password_hash:
            # Password is incorrect
            # Log failed login attempt
            try:
                supabase.rpc('log_auth_event', {
                    'p_user_id': user['id'],
                    'p_event_type': 'login_failed',
                    'p_email': user['email'],
                    'p_error_message': 'Invalid password',
                    'p_metadata': {'user_id': user_id, 'role': role}
                }).execute()
            except:
                pass

            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        # Password is correct! Generate OTP code
        otp_code = generate_otp()

        # Store OTP with expiration (10 minutes)
        otp_key = f"{user['id']}_{user['email']}"
        otp_storage[otp_key] = {
            'code': otp_code,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'user': user
        }

        # Send OTP via email
        email_sent = send_otp_email(
            recipient_email=user['email'],
            otp_code=otp_code,
            user_name=user.get('full_name')
        )

        # Also print to terminal for debugging
        print("\n" + "="*60)
        print(f"*** OTP CODE FOR {user['email']} ***")
        print(f"*** Code: {otp_code} ***")
        print(f"*** Email sent: {email_sent} ***")
        print("="*60 + "\n")
        sys.stdout.flush()

        # Log login attempt in audit table
        try:
            supabase.rpc('log_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'otp_sent',
                'p_email': user['email'],
                'p_metadata': {'user_id': user_id, 'role': role}
            }).execute()
        except Exception as e:
            print(f"Failed to log auth event: {e}")

        return jsonify({
            'success': True,
            'message': 'OTP sent successfully',
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
            },
            # Remove this in production - only for testing
            'otp_code': otp_code
        }), 200

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Login error: {e}")
        print(f"Traceback: {error_details}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login',
            'error': str(e) if __debug__ else None
        }), 500

@auth_bp.route('/verify-code', methods=['POST'])
@auth_bp.route('/verify', methods=['POST'])  # Alias for frontend compatibility
def verify_code():
    """
    Verify OTP code
    POST /api/auth/verify-code or POST /api/auth/verify
    Body: { "email": "user@example.com", "code": "123456" }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        if not email or not code:
            return jsonify({
                'success': False,
                'message': 'Email and code are required'
            }), 400

        # Find OTP entry
        otp_entry = None
        otp_key = None
        for key, value in otp_storage.items():
            if email in key:
                otp_entry = value
                otp_key = key
                break

        if not otp_entry:
            return jsonify({
                'success': False,
                'message': 'No verification code found. Please login again.'
            }), 404

        # Check if OTP is expired
        if datetime.now() > otp_entry['expires_at']:
            del otp_storage[otp_key]
            return jsonify({
                'success': False,
                'message': 'Verification code has expired. Please login again.'
            }), 400

        # Verify OTP code
        print(f"DEBUG: Received code: '{code}' (type: {type(code)})")
        print(f"DEBUG: Expected code: '{otp_entry['code']}' (type: {type(otp_entry['code'])})")
        print(f"DEBUG: Codes match: {otp_entry['code'] == code}")

        if otp_entry['code'] != code:
            return jsonify({
                'success': False,
                'message': 'Invalid verification code'
            }), 401

        # OTP is valid - get user data
        user = otp_entry['user']

        # Clear OTP from storage
        del otp_storage[otp_key]

        # Update last login timestamp
        supabase = get_supabase_admin_client()
        supabase.table('users').update({
            'last_login': datetime.now().isoformat()
        }).eq('id', user['id']).execute()

        # Log successful login
        try:
            supabase.rpc('log_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'login_success',
                'p_email': user['email']
            }).execute()
        except Exception as e:
            print(f"Failed to log auth event: {e}")

        # Generate session token (in production, use JWT)
        session_token = secrets.token_urlsafe(32)

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': session_token,
            'user': {
                'id': user['id'],
                'user_id': user['user_id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
                'is_first_login': user.get('password_reset_required', False)
            }
        }), 200

    except Exception as e:
        print(f"Verification error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during verification'
        }), 500

@auth_bp.route('/resend-code', methods=['POST'])
def resend_code():
    """
    Resend OTP code
    POST /api/auth/resend-code
    Body: { "email": "user@example.com" }
    """
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400

        # Find existing OTP entry
        otp_entry = None
        otp_key = None
        for key, value in otp_storage.items():
            if email in key:
                otp_entry = value
                otp_key = key
                break

        if not otp_entry:
            return jsonify({
                'success': False,
                'message': 'No active session found. Please login again.'
            }), 404

        user = otp_entry['user']

        # Generate new OTP code
        otp_code = generate_otp()

        # Update OTP storage
        otp_storage[otp_key] = {
            'code': otp_code,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'user': user
        }

        # Send OTP via email
        email_sent = send_otp_email(
            recipient_email=email,
            otp_code=otp_code,
            user_name=user.get('full_name')
        )

        # Also print to terminal for debugging
        print("\n" + "="*60)
        print(f"*** RESEND OTP CODE FOR {email} ***")
        print(f"*** Code: {otp_code} ***")
        print(f"*** Email sent: {email_sent} ***")
        print("="*60 + "\n")
        sys.stdout.flush()

        # Log OTP resend
        try:
            supabase = get_supabase_admin_client()
            supabase.rpc('log_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'otp_sent',
                'p_email': email,
                'p_metadata': {'action': 'resend'}
            }).execute()
        except Exception as e:
            print(f"Failed to log auth event: {e}")

        return jsonify({
            'success': True,
            'message': 'Code sent successfully',
            # Remove this in production
            'otp_code': otp_code
        }), 200

    except Exception as e:
        print(f"Resend error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while resending code'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Handle user logout
    POST /api/auth/logout
    """
    try:
        # In production, invalidate the session token
        # For now, just return success
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during logout'
        }), 500
