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


def validate_password_strength(password: str) -> tuple[bool, str]:
    import re
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    # Check for uppercase
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
        
    # Check for lowercase
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
        
    # Check for numbers
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
        
    # Check for symbols
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one symbol (!@#$%^&*...)"
        
    return True, ""


def generate_initials_from_name(full_name: str) -> str:
    """
    Generate initials from full name
    Example: "Ho Ka Yan Jeslyn" → "KYJHO"
    Logic: Take first letter of each name part except last, then add last name
    """
    name_parts = full_name.strip().split()
    if len(name_parts) == 0:
        return "USR"
    elif len(name_parts) == 1:
        return name_parts[0][:3].upper()
    else:
        last_name = name_parts[0].upper()
        middle_initials = ''.join([part[0].upper() for part in name_parts[1:]])
        return middle_initials + last_name


def generate_user_id(role: str, full_name: str, nric: str, supabase) -> str:
    """
    Generate a unique compound user ID
    Format: [INITIALS][ROLE_PREFIX]-[LAST3_NRIC]
    Example: KYJHOPAT-67I (Ka Yan Jeslyn Ho, Patient, NRIC: T0434567I)
    """
    role_prefixes = {
        'admin': 'ADM',
        'doctor': 'DOC',
        'patient': 'PAT'
    }
    prefix = role_prefixes.get(role.lower(), 'USR')
    initials = generate_initials_from_name(full_name)
    nric_suffix = nric[-3:].upper() if len(nric) >= 3 else nric.upper()

    base_id = f"{initials}{prefix}"
    user_id = f"{base_id}-{nric_suffix}"

    response = supabase.table('users').select('user_id').eq('user_id', user_id).execute()
    if response.data and len(response.data) > 0:
        counter = 2
        while True:
            new_user_id = f"{base_id}{counter}-{nric_suffix}"
            check = supabase.table('users').select('user_id').eq('user_id', new_user_id).execute()
            if not check.data or len(check.data) == 0:
                return new_user_id
            counter += 1
    return user_id


def generate_temporary_password() -> str:
    """Generate a secure temporary password"""
    import string
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(characters) for _ in range(12))
    return password


def send_otp_for_user(user: dict) -> dict:
    """
    Shared helper: generates an OTP, stores it, sends the email, and logs the event.
    Called directly by login() for non-admin users, and by biometric verify for admins.

    Returns a dict with 'success' and 'email_sent' flags.
    """
    otp_code = generate_otp()

    otp_key = f"{user['id']}_{user['email']}"
    otp_storage[otp_key] = {
        'code': otp_code,
        'expires_at': datetime.now() + timedelta(minutes=10),
        'user': user
    }

    email_sent = send_otp_email(
        recipient_email=user['email'],
        otp_code=otp_code,
        user_name=user.get('full_name')
    )

    # Debug: print OTP to terminal
    print("\n" + "="*60)
    print(f"*** OTP CODE FOR {user['email']} ***")
    print(f"*** Code: {otp_code} ***")
    print(f"*** Email sent: {email_sent} ***")
    print("="*60 + "\n")

    # Log the otp_sent event
    try:
        supabase = get_supabase_admin_client()
        supabase.rpc('log_simple_auth_event', {
            'p_user_id': user['id'],
            'p_event_type': 'otp_sent',
            'p_email': user['email'],
            'p_metadata': {'user_id': user['user_id'], 'role': user['role']}
        }).execute()
    except Exception as e:
        print(f"Failed to log auth event: {e}")

    return {
        'success': True,
        'email_sent': email_sent
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@auth_bp.route('/create-user', methods=['POST'])
def create_user():
    """
    Create a new user account
    POST /api/auth/create-user
    Body: { "full_name": "John Doe", "email": "john@example.com", "role": "patient", "nric": "S1234567A", "date_of_birth": "1990-01-01" }
    """
    try:
        data = request.get_json()
        full_name = data.get('full_name')
        email = data.get('email')
        role = data.get('role')
        nric = data.get('nric')
        date_of_birth = data.get('date_of_birth')
        health_profile = data.get('health_profile')

        # Validation
        if not full_name or not email or not role:
            return jsonify({
                'success': False,
                'message': 'Full name, email, and role are required'
            }), 400

        if not nric:
            return jsonify({
                'success': False,
                'message': 'NRIC is required'
            }), 400

        if not date_of_birth:
            return jsonify({
                'success': False,
                'message': 'Date of birth is required'
            }), 400

        if role.lower() not in ['admin', 'doctor', 'patient']:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Must be admin, doctor, or patient'
            }), 400

        supabase = get_supabase_admin_client()

        # Check if email already exists
        existing_user = supabase.table('users').select('*').eq('email', email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 409

        # Check if NRIC already exists
        existing_nric = supabase.table('users').select('*').eq('nric', nric).execute()
        if existing_nric.data and len(existing_nric.data) > 0:
            return jsonify({
                'success': False,
                'message': 'NRIC already exists'
            }), 409

        # Generate compound user ID and temporary password
        user_id = generate_user_id(role, full_name, nric, supabase)
        temp_password = generate_temporary_password()
        password_hash = hash_password(temp_password)

        new_user = {
            'user_id': user_id,
            'full_name': full_name,
            'email': email,
            'role': role.lower(),
            'password_hash': password_hash,
            'password_reset_required': True,
            'nric': nric,
            'date_of_birth': date_of_birth
        }

        response = supabase.table('users').insert(new_user).execute()
        if not response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to create user'
            }), 500

        # Create patient profile if role is patient and health_profile data is provided
        if role.lower() == 'patient' and health_profile:
            try:
                age = int(health_profile.get('age')) if health_profile.get('age') else None
                sex = health_profile.get('sex')
                blood_type = health_profile.get('bloodType')
                height = health_profile.get('height')
                weight = health_profile.get('weight')

                allergies_str = health_profile.get('allergies', '')
                allergies = [a.strip() for a in allergies_str.split(',') if a.strip()] if allergies_str else []

                conditions_str = health_profile.get('chronicConditions', '')
                chronic_conditions = [c.strip() for c in conditions_str.split(',') if c.strip()] if conditions_str else []

                vaccinations_str = health_profile.get('vaccinations', '')
                vaccinations = []
                if vaccinations_str:
                    vac_items = [v.strip() for v in vaccinations_str.split(',') if v.strip()]
                    for vac in vac_items:
                        parts = vac.rsplit(' ', 1)
                        if len(parts) == 2 and parts[1].isdigit():
                            vaccinations.append({'name': parts[0], 'year': int(parts[1])})
                        else:
                            vaccinations.append({'name': vac, 'year': None})

                profile_data = {
                    'user_id': response.data[0]['id'],
                    'custom_user_id': user_id,
                    'age': age,
                    'sex': sex,
                    'blood_type': blood_type,
                    'height': height,
                    'weight': weight,
                    'allergies': allergies,
                    'chronic_conditions': chronic_conditions,
                    'vaccinations': vaccinations
                }

                supabase.table('patient_profiles').insert(profile_data).execute()
            except Exception as e:
                print(f"Error creating patient profile: {e}")
                import traceback
                traceback.print_exc()
                # Don't fail user creation if profile creation fails

        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'user_id': user_id,
                'full_name': full_name,
                'email': email,
                'role': role.lower(),
                'temporary_password': temp_password
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
    Body: { "role": "admin|doctor|patient", "userId": "ADM001", "password": "password", "nric": "S1234567A" }

    Admin flow:  credentials OK → return pending_biometric=True (OTP sent later by biometric verify)
    Other flow:  credentials OK → send OTP immediately
    """
    try:
        data = request.get_json()
        role = data.get('role')
        user_id = data.get('userId')
        password = data.get('password')
        nric = data.get('nric')

        # Validate input
        if not role or not user_id or not password:
            return jsonify({
                'success': False,
                'message': 'Role, User ID, and password are required'
            }), 400

        if not nric:
            return jsonify({
                'success': False,
                'message': 'NRIC is required'
            }), 400

        # Input Sanitization / Validation
        import re

        if not re.match(r'^[a-zA-Z]+$', role):
            return jsonify({
                'success': False,
                'message': 'Invalid role format'
            }), 400

        if not re.match(r'^[A-Z0-9]+-[A-Z0-9]+$', user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid User ID format'
            }), 400

        if not re.match(r'^[A-Z0-9]+$', nric):
            return jsonify({
                'success': False,
                'message': 'Invalid NRIC format'
            }), 400

        supabase = get_supabase_admin_client()

        # Query user from database with NRIC validation
        response = supabase.table('users').select('*').eq('user_id', user_id).eq('role', role).eq('nric', nric).execute()

        if not response.data or len(response.data) == 0:
            try:
                supabase.rpc('log_simple_auth_event', {
                    'p_user_id': None,
                    'p_event_type': 'login_failed',
                    'p_email': None,
                    'p_error_message': 'Invalid user ID, role, or NRIC',
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

        # Verify password
        stored_password_hash = user.get('password_hash')
        if not stored_password_hash:
            return jsonify({
                'success': False,
                'message': 'Account not properly configured. Please contact administrator.'
            }), 500

        provided_password_hash = hash_password(password)

        if provided_password_hash != stored_password_hash:
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

        if user['role'] == 'admin':
            # Admin - wait for biometric verification
            return jsonify({
                'success': True,
                'message': 'Credentials verified. Biometric authentication required.',
                'pending_biometric': True,
                'user': {
                    'id': user['id'],
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'role': user['role'],
                    'is_first_login': user.get('password_reset_required', False)
                }
            }), 200

        # Doctor / Patient - send OTP immediately
        send_otp_for_user(user)

        return jsonify({
            'success': True,
            'message': 'OTP sent successfully',
            'pending_biometric': False,
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
        }), 200

    except Exception as e:
        import traceback
        print(f"Login error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login',
            'error': str(e) if __debug__ else None
        }), 500


@auth_bp.route('/verify-code', methods=['POST'])
@auth_bp.route('/verify', methods=['POST']) 
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
        if otp_entry['code'] != code:
            return jsonify({
                'success': False,
                'message': 'Invalid verification code'
            }), 401

        # OTP is valid
        user = otp_entry['user']
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

        # Generate new OTP and overwrite storage entry
        otp_code = generate_otp()
        otp_storage[otp_key] = {
            'code': otp_code,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'user': user
        }

        send_otp_email(
            recipient_email=email,
            otp_code=otp_code,
            user_name=user.get('full_name')
        )

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
        }), 200

    except Exception as e:
        print(f"Resend error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while resending code'
        }), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
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

        # Validate password strength
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': error_msg
            }), 400

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

        new_password_hash = hash_password(new_password)

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
            supabase.rpc('log_simple_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'password_reset',
                'p_email': user['email']
            }).execute()
        except Exception as e:
            print(f"Failed to log password reset: {e}")

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
        user_id = data.get('user_id') if data else None

        if user_id:
            try:
                supabase = get_supabase_admin_client()
                user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()

                if user_response.data and len(user_response.data) > 0:
                    user = user_response.data[0]
                    supabase.rpc('log_simple_auth_event', {
                        'p_user_id': user['id'],
                        'p_event_type': 'logout',
                        'p_email': user['email']
                    }).execute()
            except Exception as e:
                print(f"Failed to log logout event: {e}")

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
        response = supabase.table('users').select('*').order('created_at', desc=False).execute()

        if not response.data:
            return jsonify({
                'success': True,
                'users': []
            }), 200

        users_with_status = []
        for user in response.data:
            inactive_days = None
            if user.get('last_login'):
                try:
                    last_login = datetime.fromisoformat(user['last_login'].replace('Z', '+00:00'))
                    days_diff = (datetime.now() - last_login.replace(tzinfo=None)).days
                    if days_diff > 90:
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


@auth_bp.route('/users/<user_id>', methods=['GET'])
def get_user_by_id(user_id):
    """
    Get a single user's details by user_id
    GET /api/auth/users/:user_id
    """
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table('users').select('*').eq('user_id', user_id).execute()

        if not response.data or len(response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        user = response.data[0]

        return jsonify({
            'user_id': user['user_id'],
            'full_name': user.get('full_name') or user.get('name'),
            'email': user.get('email'),
            'role': user.get('role'),
            'nric': user.get('nric'),
            'date_of_birth': user.get('date_of_birth'),
            'created_at': user.get('created_at'),
            'last_login': user.get('last_login')
        }), 200

    except Exception as e:
        print(f"Get user error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching user'
        }), 500


@auth_bp.route('/patients/<user_id>/profile', methods=['GET'])
def get_patient_profile(user_id):
    """
    Get patient's complete profile including health data
    GET /api/auth/patients/:user_id/profile
    """
    try:
        supabase = get_supabase_admin_client()

        user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'Patient not found'
            }), 404

        user = user_response.data[0]

        if user.get('role') != 'patient':
            return jsonify({
                'success': False,
                'message': 'User is not a patient'
            }), 400

        profile_response = supabase.table('patient_profiles') \
            .select('*') \
            .eq('custom_user_id', user_id) \
            .execute()

        health_profile = None
        if profile_response.data and len(profile_response.data) > 0:
            profile = profile_response.data[0]
            health_profile = {
                'age': profile.get('age'),
                'sex': profile.get('sex'),
                'blood_type': profile.get('blood_type'),
                'height': profile.get('height'),
                'weight': profile.get('weight'),
                'allergies': profile.get('allergies', []),
                'chronic_conditions': profile.get('chronic_conditions', []),
                'vaccinations': profile.get('vaccinations', [])
            }

        return jsonify({
            'success': True,
            'patient': {
                'user_id': user['user_id'],
                'full_name': user.get('full_name') or user.get('name'),
                'email': user.get('email'),
                'nric': user.get('nric'),
                'date_of_birth': user.get('date_of_birth'),
                'created_at': user.get('created_at'),
                'health_profile': health_profile
            }
        }), 200

    except Exception as e:
        print(f"Get patient profile error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching patient profile'
        }), 500


@auth_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """
    Delete a user
    DELETE /api/auth/users/:user_id
    """
    try:
        supabase = get_supabase_admin_client()

        user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        user = user_response.data[0]

        # Delete patient profile if exists
        if user['role'] == 'patient':
            try:
                supabase.table('patient_profiles').delete().eq('custom_user_id', user_id).execute()
            except Exception as e:
                print(f"Error deleting patient profile: {e}")

        # Delete the user
        response = supabase.table('users').delete().eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to delete user'
            }), 500

        # Log deletion
        try:
            supabase.rpc('log_simple_auth_event', {
                'p_user_id': user['id'],
                'p_event_type': 'user_deleted',
                'p_email': user['email'],
                'p_metadata': {'deleted_user_id': user_id, 'deleted_role': user['role']}
            }).execute()
        except:
            pass

        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        }), 200

    except Exception as e:
        print(f"Delete user error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting user'
        }), 500


@auth_bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Update a user's details
    PUT /api/auth/users/:user_id
    Body: { "name": "New Name", "email": "new@example.com" }
    """
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')

        if not name or not email:
            return jsonify({
                'success': False,
                'message': 'Name and email are required'
            }), 400

        supabase = get_supabase_admin_client()

        user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()
        if not user_response.data or len(user_response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        update_data = {
            'full_name': name,
            'email': email,
            'updated_at': datetime.now().isoformat()
        }

        response = supabase.table('users').update(update_data).eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to update user'
            }), 500

        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': {
                'user_id': user_id,
                'name': name,
                'email': email,
            }
        }), 200

    except Exception as e:
        print(f"Update user error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating user'
        }), 500