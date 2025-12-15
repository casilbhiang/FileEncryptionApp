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

def generate_user_id(role: str, supabase) -> str:
    """Generate a unique user ID based on role"""
    # Role prefixes
    role_prefixes = {
        'admin': 'ADM',
        'doctor': 'DOC',
        'patient': 'PAT'
    }
    prefix = role_prefixes.get(role.lower(), 'USR')
    
    # Get all existing user IDs with this prefix
    response = supabase.table('users').select('user_id').ilike('user_id', f'{prefix}%').execute()
    
    # Find the highest number used
    max_number = 0
    if response.data:
        for user in response.data:
            user_id = user.get('user_id', '')
            # Extract the number part (e.g., "003" from "DOC003")
            number_part = user_id.replace(prefix, '')
            try:
                number = int(number_part)
                if number > max_number:
                    max_number = number
            except ValueError:
                continue
    
    # Generate new ID with next number
    next_number = max_number + 1
    return f"{prefix}{str(next_number).zfill(3)}"

def generate_temporary_password() -> str:
    """Generate a secure temporary password"""
    # Generate 12-character password with letters, numbers, and symbols
    import string
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(characters) for _ in range(12))
    return password

@auth_bp.route('/create-user', methods=['POST'])
def create_user():
    """
    Create a new user account
    POST /api/auth/create-user
    Body: { "full_name": "John Doe", "email": "john@example.com", "phone": "+65 1234 5678", "role": "patient" }
    """
    try:
        data = request.get_json()
        full_name = data.get('full_name')
        email = data.get('email')
        phone = data.get('phone')
        role = data.get('role')

        # Validation
        if not full_name or not email or not role:
            return jsonify({
                'success': False,
                'message': 'Full name, email, and role are required'
            }), 400

        if role.lower() not in ['admin', 'doctor', 'patient']:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Must be admin, doctor, or patient'
            }), 400

        # Get Supabase client
        supabase = get_supabase_admin_client()

        # Check if email already exists
        existing_user = supabase.table('users').select('*').eq('email', email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 409

        # Generate user ID and temporary password
        user_id = generate_user_id(role, supabase)
        temp_password = generate_temporary_password()
        password_hash = hash_password(temp_password)

        # Create user in database
        new_user = {
            'user_id': user_id,
            'full_name': full_name,
            'email': email,
            'role': role.lower(),
            'password_hash': password_hash,
            'password_reset_required': True
        }

        response = supabase.table('users').insert(new_user).execute()

        if not response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to create user'
            }), 500

        print(f"DEBUG: User created successfully, response data: {response.data}")
        print(f"DEBUG: About to log user creation event")

        # Log user creation
        try:
            print(f"Attempting to log user creation event for user_id: {response.data[0]['id']}")
            rpc_response = supabase.rpc('log_simple_auth_event', {
                'p_user_id': response.data[0]['id'],
                'p_event_type': 'user_created',
                'p_email': email
            }).execute()
            print(f"User creation log result: {rpc_response}")
        except Exception as e:
            print(f"Failed to log user creation: {e}")
            import traceback
            traceback.print_exc()

        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'user_id': user_id,
                'full_name': full_name,
                'email': email,
                'phone': phone,
                'role': role.lower(),
                'temporary_password': temp_password  # Return this once for admin to share with user
            }
        }), 201

    except Exception as e:
        print(f"Create user error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating user'
        }), 500

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
                supabase.rpc('log_simple_auth_event', {
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
                supabase.rpc('log_simple_auth_event', {
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

        if not email_sent:
            print("WARNING: Email failed to send. Proceeding for manual OTP entry (Dev Mode).")
            # return jsonify({
            #    'success': False,
            #    'message': 'Failed to send OTP email. Please check server logs or SMTP settings.'
            # }), 500

        # Log login attempt in audit table
        try:
            supabase.rpc('log_simple_auth_event', {
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
            supabase.rpc('log_simple_auth_event', {
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
            supabase.rpc('log_simple_auth_event', {
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

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset user password (for first-time login or password reset)
    POST /api/auth/reset-password
    Body: { "user_id": "ADM001", "old_password": "temp123", "new_password": "MyNewPass123!" }
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not user_id or not old_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'User ID, old password, and new password are required'
            }), 400

        # Validate new password strength
        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'message': 'New password must be at least 8 characters long'
            }), 400

        # Get user from database
        supabase = get_supabase_admin_client()
        response = supabase.table('users').select('*').eq('user_id', user_id).execute()

        if not response.data or len(response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        user = response.data[0]

        # Verify old password
        stored_password_hash = user.get('password_hash')
        provided_password_hash = hash_password(old_password)

        if provided_password_hash != stored_password_hash:
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401

        # Hash new password
        new_password_hash = hash_password(new_password)

        # Update password and clear password_reset_required flag
        update_response = supabase.table('users').update({
            'password_hash': new_password_hash,
            'password_reset_required': False,
            'updated_at': datetime.now().isoformat()
        }).eq('id', user['id']).execute()

        if not update_response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to update password'
            }), 500

        # Log password reset
        try:
            print(f"Attempting to log password reset event for user_id: {user['id']}")
            rpc_response = supabase.rpc('log_simple_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'password_reset',
                'p_email': user['email']
            }).execute()
            print(f"Password reset log result: {rpc_response}")
        except Exception as e:
            print(f"Failed to log password reset: {e}")
            import traceback
            traceback.print_exc()

        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200

    except Exception as e:
        print(f"Password reset error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during password reset'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Handle user logout
    POST /api/auth/logout
    Body: { "user_id": "DOC001" }
    """
    try:
        data = request.get_json()
        print(f"DEBUG: Logout request data: {data}")
        user_id = data.get('user_id') if data else None
        print(f"DEBUG: Extracted user_id: {user_id}")

        # Log logout event if user_id provided
        if user_id:
            print(f"DEBUG: user_id is truthy, proceeding with logout logging")
            try:
                supabase = get_supabase_admin_client()

                # Get user details for logging
                print(f"Looking up user with user_id: {user_id}")
                user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()
                print(f"User lookup result: {user_response.data}")

                if user_response.data and len(user_response.data) > 0:
                    user = user_response.data[0]
                    print(f"Found user: id={user['id']}, email={user['email']}, user_id={user['user_id']}")

                    # Log logout event
                    print(f"Attempting to log logout event for UUID: {user['id']}")
                    rpc_response = supabase.rpc('log_simple_auth_event', {
                        'p_user_id': user['id'],
                        'p_event_type': 'logout',
                        'p_email': user['email']
                    }).execute()
                    print(f"Logout log result: {rpc_response.data}")
                else:
                    print(f"No user found with user_id: {user_id}")
            except Exception as e:
                print(f"Failed to log logout event: {e}")
                import traceback
                traceback.print_exc()

        # In production, invalidate the session token
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

@auth_bp.route('/users', methods=['GET'])
def get_users():
    """
    Get all users from the database
    GET /api/auth/users
    """
    try:
        supabase = get_supabase_admin_client()

        # Fetch all users from database
        response = supabase.table('users').select('*').order('created_at', desc=False).execute()

        if not response.data:
            return jsonify({
                'success': True,
                'users': []
            }), 200

        # Calculate inactive days for each user
        users_with_status = []
        for user in response.data:
            # Calculate inactive days if last_login exists
            inactive_days = None
            if user.get('last_login'):
                try:
                    last_login = datetime.fromisoformat(user['last_login'].replace('Z', '+00:00'))
                    days_diff = (datetime.now() - last_login.replace(tzinfo=None)).days
                    if days_diff > 90:  # Consider inactive if more than 90 days
                        inactive_days = days_diff
                except Exception as e:
                    print(f"Error calculating inactive days for user {user.get('user_id')}: {e}")

            users_with_status.append({
                'id': user['user_id'],
                'name': user['full_name'],
                'email': user['email'],
                'role': user['role'].capitalize(),
                'status': 'Active' if user.get('is_active', False) else 'Inactive',
                'inactiveDays': inactive_days,
                'lastLogin': user.get('last_login'),
                'createdAt': user.get('created_at')
            })

        return jsonify({
            'success': True,
            'users': users_with_status
        }), 200

    except Exception as e:
        print(f"Get users error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching users'
        }), 500
