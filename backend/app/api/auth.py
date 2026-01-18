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
        # Single name, use first 3 letters
        return name_parts[0][:3].upper()
    else:
        # Multiple names: initials of all except last + last name
        # "Ho Ka Yan Jeslyn" → K + Y + J + HO = KYJHO
        last_name = name_parts[0].upper()  # First part is usually last name in Asian names
        middle_initials = ''.join([part[0].upper() for part in name_parts[1:]])
        return middle_initials + last_name

def generate_user_id(role: str, full_name: str, nric: str, supabase) -> str:
    """
    Generate a unique compound user ID
    Format: [INITIALS][ROLE_PREFIX]-[LAST3_NRIC]
    Example: KYJHOPAT-67I (Ka Yan Jeslyn Ho, Patient, NRIC: T0434567I)
    """
    # Role prefixes
    role_prefixes = {
        'admin': 'ADM',
        'doctor': 'DOC',
        'patient': 'PAT'
    }
    prefix = role_prefixes.get(role.lower(), 'USR')

    # Generate initials from name
    initials = generate_initials_from_name(full_name)

    # Get last 3 characters of NRIC
    nric_suffix = nric[-3:].upper() if len(nric) >= 3 else nric.upper()

    # Combine: INITIALS + ROLE_PREFIX - NRIC_SUFFIX
    # Example: KYJHO + PAT - 67I = KYJHOPAT-67I
    base_id = f"{initials}{prefix}"
    user_id = f"{base_id}-{nric_suffix}"

    # Check if this ID already exists (very unlikely but check anyway)
    response = supabase.table('users').select('user_id').eq('user_id', user_id).execute()

    if response.data and len(response.data) > 0:
        # ID exists (very rare), append a number
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
    Body: { "full_name": "John Doe", "email": "john@example.com", "phone": "+65 1234 5678", "role": "patient", "nric": "S1234567A", "date_of_birth": "1990-01-01" }
    """
    try:
        data = request.get_json()
        full_name = data.get('full_name')
        email = data.get('email')
        phone = data.get('phone')
        role = data.get('role')
        nric = data.get('nric')
        date_of_birth = data.get('date_of_birth')
        health_profile = data.get('health_profile')  # Optional, only for patients

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

        # Get Supabase client
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

        # Create user in database
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

        print(f"DEBUG: User created successfully, response data: {response.data}")
        print(f"NOTE: User creation will be automatically logged by database trigger")

        # Create patient profile if role is patient and health_profile data is provided
        if role.lower() == 'patient' and health_profile:
            try:
                print(f"Creating patient profile for user: {user_id}")

                # Parse health profile data
                age = int(health_profile.get('age')) if health_profile.get('age') else None
                sex = health_profile.get('sex')
                blood_type = health_profile.get('bloodType')
                height = health_profile.get('height')
                weight = health_profile.get('weight')

                # Parse allergies (comma-separated string to array)
                allergies_str = health_profile.get('allergies', '')
                allergies = [a.strip() for a in allergies_str.split(',') if a.strip()] if allergies_str else []

                # Parse chronic conditions (comma-separated string to array)
                conditions_str = health_profile.get('chronicConditions', '')
                chronic_conditions = [c.strip() for c in conditions_str.split(',') if c.strip()] if conditions_str else []

                # Parse vaccinations (comma-separated string to array of objects)
                vaccinations_str = health_profile.get('vaccinations', '')
                vaccinations = []
                if vaccinations_str:
                    vac_items = [v.strip() for v in vaccinations_str.split(',') if v.strip()]
                    for vac in vac_items:
                        # Simple format: "Covid-19 2020" or just "Covid-19"
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

                profile_response = supabase.table('patient_profiles').insert(profile_data).execute()

                if profile_response.data:
                    print(f"Patient profile created successfully for {user_id}")
                else:
                    print(f"Warning: Failed to create patient profile for {user_id}")

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
    Body: { "role": "admin|doctor|patient", "userId": "ADM001", "password": "password", "nric": "S1234567A" }
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
        
        # Validate Role (letters only)
        if not re.match(r'^[a-zA-Z]+$', role):
             return jsonify({
                'success': False,
                'message': 'Invalid role format'
            }), 400

        # Validate User ID (Alphanumeric and hyphens, strictly following the generated format)
        # Format example: KYJHOPAT-67I
        if not re.match(r'^[A-Z0-9]+-[A-Z0-9]+$', user_id):
             return jsonify({
                'success': False,
                'message': 'Invalid User ID format'
            }), 400

        # Validate NRIC (Alphanumeric)
        if not re.match(r'^[A-Z0-9]+$', nric):
             return jsonify({
                'success': False,
                'message': 'Invalid NRIC format'
            }), 400

        # Get Supabase admin client
        supabase = get_supabase_admin_client()

        # Query user from database with NRIC validation
        response = supabase.table('users').select('*').eq('user_id', user_id).eq('role', role).eq('nric', nric).execute()

        if not response.data or len(response.data) == 0:
            # Log failed login attempt
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

@auth_bp.route('/users/<user_id>', methods=['GET'])
def get_user_by_id(user_id):
    """
    Get a single user's details by user_id
    GET /api/auth/users/:user_id
    """
    try:
        supabase = get_supabase_admin_client()

        # Fetch user from database
        response = supabase.table('users').select('*').eq('user_id', user_id).execute()

        if not response.data or len(response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        user = response.data[0]

        # Return user data (excluding sensitive fields)
        return jsonify({
            'user_id': user['user_id'],
            'full_name': user.get('full_name') or user.get('name'),
            'email': user.get('email'),
            'phone': user.get('phone'),
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

        # Fetch user basic info
        user_response = supabase.table('users').select('*').eq('user_id', user_id).execute()

        if not user_response.data or len(user_response.data) == 0:
            return jsonify({
                'success': False,
                'message': 'Patient not found'
            }), 404

        user = user_response.data[0]

        # Check if user is a patient
        if user.get('role') != 'patient':
            return jsonify({
                'success': False,
                'message': 'User is not a patient'
            }), 400

        # Fetch patient health profile
        profile_response = supabase.table('patient_profiles')\
            .select('*')\
            .eq('custom_user_id', user_id)\
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

        # Return combined data
        return jsonify({
            'success': True,
            'patient': {
                'user_id': user['user_id'],
                'full_name': user.get('full_name') or user.get('name'),
                'email': user.get('email'),
                'phone': user.get('phone'),
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
