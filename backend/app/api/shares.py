from flask import Blueprint, request, jsonify
from supabase import create_client
import os
from datetime import datetime, timezone
import logging

# Set up logger
logger = logging.getLogger(__name__)

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
        shared_by_uuid = data.get('shared_by_uuid')
        shared_with = data['shared_with']
        access_level = data.get('access_level', 'read')
        message = data.get('message', '')
        
        # Validate access_level
        if access_level not in ['read', 'write']:
            return jsonify({'error': 'Invalid access level. Must be "read" or "write"'}), 400
        
        # Verify file exists and user owns it
        file_check = supabase.table('encrypted_files')\
            .select('id, userid, owner_id, original_filename, file_size, file_extension')\
            .eq('id', file_id)\
            .eq('is_deleted', False)\
            .eq('upload_status', 'completed')\
            .execute()
        
        if not file_check.data:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = file_check.data[0]
        
        # Get sender's UUID if not provided
        if not shared_by_uuid:
            sender_query = supabase.table('users')\
                .select('id')\
                .eq('user_id', shared_by)\
                .limit(1)\
                .execute()
            
            if sender_query.data:
                shared_by_uuid = sender_query.data[0]['id']
                logger.debug(f"Found sender UUID for user_id: {shared_by}")
            else:
                logger.warning(f"Could not find sender UUID for user_id: {shared_by}")
        
        # Check if user owns the file
        if shared_by_uuid and file_data['userid'] != shared_by_uuid:
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
        
        logger.info(f"File shared: {file_id} from {shared_by} to {shared_with} (access: {access_level})")
        
        # ===== CREATE NOTIFICATION FOR RECIPIENT =====
        notification_sent = False
        notification_id = None
        
        try:
            from app.api.notifications import create_share_notification
            
            notification = create_share_notification(
                file_data=file_data,
                shared_by=shared_by,
                shared_with=shared_with,
                access_level=access_level
            )
            
            if notification:
                logger.info(f"Share notification created: {notification['id']}")
                notification_sent = True
                notification_id = notification['id']
            else:
                logger.warning("Notification creation failed, but share succeeded")
                
        except ImportError as e:
            logger.error(f"Could not import create_share_notification: {e}")
        except Exception as e:
            logger.error(f"Error creating notification: {e}", exc_info=True)
        
        # Create success notification for sender
        try:
            from app.api.notifications import _create_notification_core
            
            sender_notification = _create_notification_core(
                user_id=shared_by,
                title='File Shared Successfully',
                message=f'You shared "{file_data["original_filename"]}" with {shared_with}',
                notification_type='info',
                metadata={
                    'file_id': file_id,
                    'file_name': file_data['original_filename'],
                    'recipient_id': shared_with,
                    'share_id': share_id
                },
                related_file_id=file_id,
                related_user_id=shared_with
            )
            
            if sender_notification:
                logger.debug(f"Sender notification created: {sender_notification['id']}")
                
        except Exception as e:
            logger.error(f"Could not create sender notification: {e}")
        
        return jsonify({
            'success': True,
            'message': 'File shared successfully',
            'share_id': share_id,
            'file_name': file_data['original_filename'],
            'shared_with': shared_with,
            'access_level': access_level,
            'notification': {
                'sent': notification_sent,
                'id': notification_id
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Share error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    
    
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
        
        # First get user's UUID
        user_query = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_query.data:
            return jsonify({'error': 'User not found'}), 404
        
        user_uuid = user_query.data[0]['id']
        
        # Verify file exists and user owns it
        file_check = supabase.table('encrypted_files')\
            .select('userid')\
            .eq('id', file_id)\
            .eq('is_deleted', False)\
            .execute()
        
        if not file_check.data:
            return jsonify({'error': 'File not found'}), 404
        
        if file_check.data[0]['userid'] != user_uuid:
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
        logger.error(f"Get shares error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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
        logger.error(f"Get my shares error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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
            logger.info(f"Share revoked: {share_id}")
            return jsonify({
                'message': 'Share revoked successfully',
                'share_id': share_id
            }), 200
        else:
            return jsonify({'error': 'Failed to revoke share'}), 500
        
    except Exception as e:
        logger.error(f"Revoke share error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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
                    'owner_uuid': file_data['userid'],
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
        logger.error(f"Get shared files error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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
            return jsonify({'error': 'User ID is required'}), 400
        
        logger.debug(f"Getting available users for user_id: {user_id}")
        
        # Check if user exists
        user_query = supabase.table('users')\
            .select('user_id, role, email, full_name')\
            .eq('user_id', user_id)\
            .eq('is_active', True)\
            .execute()
        
        if not user_query.data:
            logger.warning(f"User {user_id} not found or inactive")
            return jsonify({
                'users': [],
                'count': 0
            }), 200
        
        current_user = user_query.data[0]
        user_role = current_user.get('role', 'patient')
        
        logger.debug(f"User found: role={user_role}")
        
        connected_users = []
        
        if user_role.lower() == 'patient':
            # Get connected doctors
            connections_query = supabase.table('doctor_patient_connections')\
                .select('doctor_id, connection_status')\
                .eq('patient_id', user_id)\
                .eq('connection_status', 'active')\
                .execute()
            
            if connections_query.data:
                doctor_ids = [conn['doctor_id'] for conn in connections_query.data]
                
                doctors_query = supabase.table('users')\
                    .select('user_id, full_name, email, role')\
                    .in_('user_id', doctor_ids)\
                    .eq('is_active', True)\
                    .execute()
                
                if doctors_query.data:
                    for doctor in doctors_query.data:
                        connected_users.append({
                            'id': doctor['user_id'],
                            'name': doctor.get('full_name', doctor['user_id']),
                            'email': doctor['email'],
                            'role': doctor['role']
                        })
                    
        elif user_role.lower() == 'doctor':
            # Get connected patients
            connections_query = supabase.table('doctor_patient_connections')\
                .select('patient_id, connection_status')\
                .eq('doctor_id', user_id)\
                .eq('connection_status', 'active')\
                .execute()
            
            if connections_query.data:
                patient_ids = [conn['patient_id'] for conn in connections_query.data]
                
                patients_query = supabase.table('users')\
                    .select('user_id, full_name, email, role')\
                    .in_('user_id', patient_ids)\
                    .eq('is_active', True)\
                    .execute()
                
                if patients_query.data:
                    for patient in patients_query.data:
                        connected_users.append({
                            'id': patient['user_id'],
                            'name': patient.get('full_name', patient['user_id']),
                            'email': patient['email'],
                            'role': patient['role']
                        })
        
        logger.info(f"Found {len(connected_users)} available users for {user_id}")
        
        return jsonify({
            'users': connected_users,
            'count': len(connected_users)
        }), 200
        
    except Exception as e:
        logger.error(f"Get available users error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    
    
# ===== Get Files Shared With Specific Recipient =====
@shares_bp.route('/shared-with/<recipient_id>', methods=['GET'])
def get_files_shared_with_recipient(recipient_id):
    """
    Get file IDs that have already been shared with a specific recipient
    Query params: shared_by (user_id of the sharer)
    """
    try:
        shared_by = request.args.get('shared_by')
        if not shared_by:
            return jsonify({'error': 'shared_by parameter is required'}), 400
        
        logger.debug(f"Checking files shared by {shared_by} with {recipient_id}")
        
        # Query for active shares between these two users
        shares = supabase.table('file_shares')\
            .select('file_id')\
            .eq('shared_by', shared_by)\
            .eq('shared_with', recipient_id)\
            .eq('share_status', 'active')\
            .execute()
        
        file_ids = [share['file_id'] for share in shares.data]
        
        logger.info(f"Found {len(file_ids)} files already shared")
        
        return jsonify({
            'file_ids': file_ids,
            'count': len(file_ids),
            'shared_by': shared_by,
            'shared_with': recipient_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting files shared with recipient: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500