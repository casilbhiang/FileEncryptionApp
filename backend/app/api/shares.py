# shares.py - Separate file for share-related endpoints

from flask import Blueprint, request, jsonify
from supabase import create_client
import os
from datetime import datetime, timezone

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Blueprint for share routes
shares_bp = Blueprint('shares', __name__, url_prefix='/api/shares')

# ===== Share File =====
@shares_bp.route('/share', methods=['POST'])
def share_file():
    """
    Share a file with another user
    Expects JSON: {
        "file_id": "uuid",
        "shared_by": "user_id",
        "shared_with": "user_id",
        "access_level": "read" (default) or "write",
        "message": "optional message"
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['file_id', 'shared_by', 'shared_with']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        file_id = data['file_id']
        shared_by = data['shared_by']
        shared_with = data['shared_with']
        access_level = data.get('access_level', 'read')
        message = data.get('message', '')
        
        # Validate access_level
        if access_level not in ['read', 'write']:
            return jsonify({'error': 'Invalid access level. Must be "read" or "write"'}), 400
        
        # Verify file exists and user owns it
        file_check = supabase.table('encrypted_files')\
            .select('id, owner_id, original_filename')\
            .eq('id', file_id)\
            .eq('is_deleted', False)\
            .eq('upload_status', 'completed')\
            .execute()
        
        if not file_check.data:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = file_check.data[0]
        
        # Check if user owns the file
        if file_data['owner_id'] != shared_by:
            return jsonify({'error': 'You do not own this file'}), 403
        
        # Check if trying to share with yourself
        if shared_by == shared_with:
            return jsonify({'error': 'Cannot share file with yourself'}), 400
        
        # Check if already shared (active share)
        existing_share = supabase.table('file_shares')\
            .select('id')\
            .eq('file_id', file_id)\
            .eq('shared_with', shared_with)\
            .eq('share_status', 'active')\
            .execute()
        
        if existing_share.data:
            return jsonify({
                'error': 'File already shared with this user',
                'share_id': existing_share.data[0]['id']
            }), 409
        
        # Create share record
        share_record = {
            'file_id': file_id,
            'shared_by': shared_by,
            'shared_with': shared_with,
            'access_level': access_level,
            'share_status': 'active',
            'shared_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table('file_shares').insert(share_record).execute()
        
        if not result.data:
            return jsonify({'error': 'Failed to create share'}), 500
        
        share_id = result.data[0]['id']
        
        print(f"File shared: {file_id} from {shared_by} to {shared_with}")
        
        return jsonify({
            'message': 'File shared successfully',
            'share_id': share_id,
            'file_name': file_data['original_filename'],
            'shared_with': shared_with,
            'access_level': access_level
        }), 201
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Share error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Get Shares for a File =====
@shares_bp.route('/file/<file_id>', methods=['GET'])
def get_file_shares(file_id):
    """
    Get all active shares for a specific file
    Query params: user_id (to verify ownership)
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Verify user owns the file
        file_check = supabase.table('encrypted_files')\
            .select('owner_id')\
            .eq('id', file_id)\
            .eq('is_deleted', False)\
            .execute()
        
        if not file_check.data:
            return jsonify({'error': 'File not found'}), 404
        
        if file_check.data[0]['owner_id'] != user_id:
            return jsonify({'error': 'Not authorized. You do not own this file'}), 403
        
        # Get all active shares for this file
        shares = supabase.table('file_shares')\
            .select('*')\
            .eq('file_id', file_id)\
            .eq('share_status', 'active')\
            .execute()
        
        return jsonify({
            'file_id': file_id,
            'shares': shares.data,
            'count': len(shares.data)
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get shares error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Get My Shares (Files I've Shared) =====
@shares_bp.route('/my-shares', methods=['GET'])
def get_my_shares():
    """
    Get files that the user has shared with others
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        # Calculate pagination
        start_idx = (page - 1) * limit
        
        # Get shares created by this user
        shares_query = supabase.table('file_shares')\
            .select('*, encrypted_files(*)')\
            .eq('shared_by', user_id)\
            .eq('share_status', 'active')\
            .order('shared_at', desc=True)\
            .range(start_idx, start_idx + limit - 1)
        
        shares_result = shares_query.execute()
        
        # Format response
        shares = []
        for share in shares_result.data:
            file_data = share.get('encrypted_files', {})
            if file_data and not file_data.get('is_deleted'):
                shares.append({
                    'share_id': share['id'],
                    'file_id': share['file_id'],
                    'file_name': file_data.get('original_filename', 'Unknown'),
                    'shared_with': share['shared_with'],
                    'access_level': share['access_level'],
                    'shared_at': share['shared_at'],
                    'file_size': file_data.get('file_size', 0),
                    'file_type': file_data.get('file_extension', '')
                })
        
        # Get total count
        count_query = supabase.table('file_shares')\
            .select('id', count='exact')\
            .eq('shared_by', user_id)\
            .eq('share_status', 'active')\
            .execute()
        
        total_shares = count_query.count if hasattr(count_query, 'count') else len(shares)
        
        return jsonify({
            'shares': shares,
            'total': total_shares,
            'page': page,
            'limit': limit,
            'total_pages': (total_shares + limit - 1) // limit if limit > 0 else 0
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get my shares error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Revoke/Delete a Share =====
@shares_bp.route('/<share_id>/revoke', methods=['POST'])
def revoke_share(share_id):
    """
    Revoke a file share (mark as revoked)
    Query params: user_id (to verify ownership)
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get the share to verify ownership
        share_check = supabase.table('file_shares')\
            .select('*, encrypted_files!inner(owner_id)')\
            .eq('id', share_id)\
            .eq('share_status', 'active')\
            .execute()
        
        if not share_check.data:
            return jsonify({'error': 'Share not found or already revoked'}), 404
        
        # Check if user is the file owner or the one who shared it
        share_data = share_check.data[0]
        file_owner_id = share_data['encrypted_files']['owner_id']
        
        if user_id not in [file_owner_id, share_data['shared_by']]:
            return jsonify({'error': 'Not authorized to revoke this share'}), 403
        
        # Revoke the share
        result = supabase.table('file_shares')\
            .update({
                'share_status': 'revoked',
                'revoked_at': datetime.now(timezone.utc).isoformat()
            })\
            .eq('id', share_id)\
            .execute()
        
        if result.data:
            print(f"Share revoked: {share_id}")
            return jsonify({
                'message': 'Share revoked successfully',
                'share_id': share_id
            }), 200
        else:
            return jsonify({'error': 'Failed to revoke share'}), 500
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Revoke share error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Get Shared With Me Files Only =====
@shares_bp.route('/shared-with-me', methods=['GET'])
def get_shared_with_me():
    """
    Get only files shared with the current user
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get query parameters
        search_query = request.args.get('search', '').strip()
        sort_by = request.args.get('sort', 'shared_at')
        sort_order = request.args.get('order', 'desc')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        # Calculate pagination
        start_idx = (page - 1) * limit
        
        # Get active shares for this user
        shares_query = supabase.table('file_shares')\
            .select('*, encrypted_files(*)')\
            .eq('shared_with', user_id)\
            .eq('share_status', 'active')
        
        # Apply sorting
        if sort_by == 'shared_at':
            if sort_order == 'asc':
                shares_query = shares_query.order('shared_at')
            else:
                shares_query = shares_query.order('shared_at', desc=True)
        
        # Apply pagination
        shares_query = shares_query.range(start_idx, start_idx + limit - 1)
        
        # Execute query
        shares_result = shares_query.execute()
        
        if not shares_result.data:
            return jsonify({
                'files': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'total_pages': 0
            }), 200
        
        # Process the data
        files = []
        for share in shares_result.data:
            file_data = share['encrypted_files']
            if file_data and not file_data.get('is_deleted') and file_data.get('upload_status') == 'completed':
                files.append({
                    'id': file_data['id'],
                    'name': file_data['original_filename'],
                    'size': file_data['file_size'],
                    'uploaded_at': file_data['uploaded_at'],
                    'type': file_data['file_extension'],
                    'shared_by': share['shared_by'],
                    'shared_at': share['shared_at'],
                    'access_level': share['access_level'],
                    'is_owned': False,
                    'owner_id': file_data['owner_id'],
                    'share_id': share['id']
                })
        
        # Apply search filter if needed
        if search_query:
            files = [f for f in files if search_query.lower() in f['name'].lower()]
        
        # Apply additional sorting
        if sort_by == 'name':
            files.sort(key=lambda x: x['name'].lower(), reverse=(sort_order == 'desc'))
        elif sort_by == 'size':
            files.sort(key=lambda x: x['size'], reverse=(sort_order == 'desc'))
        
        # Get total count
        count_query = supabase.table('file_shares')\
            .select('id', count='exact')\
            .eq('shared_with', user_id)\
            .eq('share_status', 'active')\
            .execute()
        
        total_files = count_query.count if hasattr(count_query, 'count') else len(files)
        
        return jsonify({
            'files': files,
            'total': total_files,
            'page': page,
            'limit': limit,
            'total_pages': (total_files + limit - 1) // limit if limit > 0 else 0,
            'has_more': (page * limit) < total_files
        }), 200
    
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get shared files error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500


# ===== Get Available Users to Share With =====
@shares_bp.route('/available-users', methods=['GET'])
def get_available_users():
    """
    Get list of connected users that files can be shared with
    Based on doctor_patient_connections table
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            print("ERROR: No user_id provided in query params")
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f"=== START: Getting available users for user_id: {user_id} ===")
        
        # Check if user_id exists in users table
        print(f"1. Checking if user {user_id} exists in users table...")
        
        user_query = supabase.table('users')\
            .select('user_id, role, email, full_name')\
            .eq('user_id', user_id)\
            .eq('is_active', True)\
            .execute()
        
        print(f"User query result: {user_query.data}")
        
        if not user_query.data:
            print(f"ERROR: User {user_id} not found or inactive in users table")
            return jsonify({
                'error': f'User {user_id} not found or inactive',
                'users': [],
                'count': 0
            }), 200  # Return empty array instead of 404
        
        current_user = user_query.data[0]
        user_role = current_user.get('role', 'patient')  # Default to patient
        user_name = current_user.get('full_name', user_id)    # Use full_name or user_id
        
        print(f"2. User {user_id} found: name={user_name}, role={user_role}")
        
        connected_users = []
        
        if user_role.lower() == 'patient':
            print(f"3. Looking for doctors connected to patient {user_id}...")
            
            # Check doctor_patient_connections table
            try:
                connections_query = supabase.table('doctor_patient_connections')\
                    .select('doctor_id, connection_status')\
                    .eq('patient_id', user_id)\
                    .eq('connection_status', 'active')\
                    .execute()
                
                print(f"Connections query result: {connections_query.data}")
                print(f"Number of connections found: {len(connections_query.data) if connections_query.data else 0}")
                
                if connections_query.data:
                    doctor_ids = [conn['doctor_id'] for conn in connections_query.data]
                    print(f"Doctor IDs found: {doctor_ids}")
                    
                    # Get doctor details
                    if doctor_ids:
                        doctors_query = supabase.table('users')\
                            .select('user_id, full_name, email, role')\
                            .in_('user_id', doctor_ids)\
                            .eq('is_active', True)\
                            .execute()
                        
                        print(f"Doctors query result: {doctors_query.data}")
                        
                        if doctors_query.data:
                            for doctor in doctors_query.data:
                                connected_users.append({
                                    'id': doctor['user_id'],
                                    'name': doctor.get('full_name', doctor['user_id']),
                                    'email': doctor['email'],
                                    'role': doctor['role']
                                })
                            print(f"Added {len(doctors_query.data)} doctors")
                else:
                    print(f"No active doctor connections found for patient {user_id}")
                    
            except Exception as conn_error:
                print(f"Error querying connections: {str(conn_error)}")
                
        elif user_role.lower() == 'doctor':
            print(f"3. Looking for patients connected to doctor {user_id}...")
            
            try:
                connections_query = supabase.table('doctor_patient_connections')\
                    .select('patient_id, connection_status')\
                    .eq('doctor_id', user_id)\
                    .eq('connection_status', 'active')\
                    .execute()
                
                print(f"Connections query result: {connections_query.data}")
                print(f"Number of connections found: {len(connections_query.data) if connections_query.data else 0}")
                
                if connections_query.data:
                    patient_ids = [conn['patient_id'] for conn in connections_query.data]
                    print(f"Patient IDs found: {patient_ids}")
                    
                    # Get patient details
                    if patient_ids:
                        patients_query = supabase.table('users')\
                            .select('user_id, full_name, email, role')\
                            .in_('user_id', patient_ids)\
                            .eq('is_active', True)\
                            .execute()
                        
                        print(f"Patients query result: {patients_query.data}")
                        
                        if patients_query.data:
                            for patient in patients_query.data:
                                connected_users.append({
                                    'id': patient['user_id'],
                                    'name': patient.get('full_name', patient['user_id']),
                                    'email': patient['email'],
                                    'role': patient['role']
                                })
                            print(f"Added {len(patients_query.data)} patients")
                else:
                    print(f"No active patient connections found for doctor {user_id}")
                    
            except Exception as conn_error:
                print(f"Error querying connections: {str(conn_error)}")
        else:
            print(f"3. User role '{user_role}' not recognized, returning empty list")
        
        print(f"4. Final connected users: {connected_users}")
        print(f"=== END: Found {len(connected_users)} users ===")
        
        # Always return success with users array (even if empty)
        return jsonify({
            'users': connected_users,
            'count': len(connected_users),
            'debug': {
                'requested_user_id': user_id,
                'user_role': user_role,
                'user_name': user_name
            }
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get available users error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500