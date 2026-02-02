# app/api/notifications.py
from flask import Blueprint, request, jsonify
import os
from datetime import datetime
from supabase import create_client

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


# ===== CORE NOTIFICATION CREATION FUNCTION =====
def _create_notification_core(user_id, title, message, notification_type='info', 
                              metadata=None, related_file_id=None, related_user_id=None, is_read=False):
    """
    CORE FUNCTION: Creates a notification in the database
    Used by both HTTP endpoint and internal helpers
    
    Args:
        user_id: String user_id (like 'patient1') or 'all'
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        metadata: Optional JSON metadata
        related_file_id: Optional related file ID
        related_user_id: Optional related user ID
        is_read: Whether notification is read (default: False)
    
    Returns:
        Created notification dict or None if failed
    """
    try:
        print(f"📝 [CORE] Creating {notification_type} notification for: {user_id}")
        
        # Find user's UUID from users table
        # Try to find by user_id field first (string ID like 'patient1')
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            print(f"[CORE] User not found with user_id: {user_id}, trying by UUID...")
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            print(f"❌ [CORE] User not found: {user_id}")
            return None
        
        user_uuid = user_result.data[0]['id']
        print(f"[CORE] Found user UUID: {user_uuid} for user_id: {user_id}")
        
        # Prepare notification data
        notification_data = {
            'user_id': user_uuid,  # UUID in database
            'notification_type': notification_type,
            'title': title,
            'message': message,
            'is_read': is_read,
            'related_file_id': related_file_id,
            'related_user_id': related_user_id,
            'metadata': metadata,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'read_at': datetime.utcnow().isoformat() + 'Z' if is_read else None
        }
        
        print(f"📝 [CORE] Inserting into notifications table")
        result = supabase.table('notifications')\
            .insert(notification_data)\
            .execute()
        
        if not result.data:
            print(f"[CORE] Failed to insert notification")
            return None
        
        created_notification = result.data[0]
        print(f"[CORE] Notification created: {created_notification['id']}")
        print(f"   Stored with user_id (UUID): {created_notification['user_id']}")
        return created_notification
        
    except Exception as e:
        print(f"❌ [CORE] Error creating notification: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# ===== SHARE-SPECIFIC HELPER =====
def create_share_notification(file_data, shared_by, shared_with, access_level='read'):
    """
    HELPER: Create notification for file sharing
    Used internally by shares.py module
    
    Args:
        file_data: Dict with file info (must have 'id' and 'original_filename')
        shared_by: String user_id of sender (like 'doctor1')
        shared_with: String user_id of recipient (like 'patient1')
        access_level: 'read' or 'write'
    
    Returns:
        Created notification or None
    """
    try:
        print(f"[SHARE] Creating share notification from {shared_by} to {shared_with}")
        
        # Get sender details for friendly message
        sender_result = supabase.table('users')\
            .select('full_name')\
            .eq('user_id', shared_by)\
            .limit(1)\
            .execute()
        
        sender_name = "A user"
        if sender_result.data:
            sender_name = sender_result.data[0].get('full_name', shared_by)
            print(f"[SHARE] Sender: {sender_name}")
        
        # Get recipient details
        recipient_result = supabase.table('users')\
            .select('id, full_name')\
            .eq('user_id', shared_with)\
            .limit(1)\
            .execute()
        
        if not recipient_result.data:
            print(f"[SHARE] Recipient {shared_with} not found in users table!")
            return None
        
        recipient_uuid = recipient_result.data[0]['id']
        recipient_name = recipient_result.data[0].get('full_name', shared_with)
        
        print(f"   [SHARE] Recipient details:")
        print(f"   String user_id: {shared_with}")
        print(f"   UUID: {recipient_uuid}")
        print(f"   Name: {recipient_name}")
        
        # Use the core function to create notification
        notification = _create_notification_core(
            user_id=shared_with,  # Recipient's string ID
            title='📁 File Shared With You',
            message=f'{sender_name} shared "{file_data["original_filename"]}" with you',
            notification_type='file_shared',
            metadata={
                'file_id': file_data['id'],
                'file_name': file_data['original_filename'],
                'file_size': file_data.get('file_size'),
                'file_type': file_data.get('file_extension'),
                'sender_id': shared_by,
                'sender_name': sender_name,
                'recipient_id': shared_with,
                'recipient_name': recipient_name,
                'access_level': access_level,
                'share_type': 'direct_share',
                'action': 'view_file'
            },
            related_file_id=file_data['id'],
            related_user_id=shared_by,
            is_read=False
        )
        
        if notification:
            print(f" [SHARE] Share notification created: {notification['id']}")
            print(f"   For user UUID: {notification.get('user_id', 'UNKNOWN')}")
        else:
            print(f" [SHARE] Failed to create share notification")
        
        return notification
        
    except Exception as e:
        print(f" [SHARE] Error creating share notification: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# ===== GET all notifications for a user =====
@notifications_bp.route('/', methods=['GET'], strict_slashes=False)
def get_notifications():
    """Get notifications for a user"""
    try:
        user_identifier = request.args.get('user_id')
        if not user_identifier:
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f" Looking up notifications for user identifier: {user_identifier}")
        
        # First, get the user's UUID from the users table
        # Try to find user by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_identifier)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            print(f" User not found with user_id: {user_identifier}, trying by UUID...")
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_identifier)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            print(f" User not found with identifier: {user_identifier}")
            return jsonify({
                'success': True,
                'notifications': [],
                'count': 0,
                'unread_count': 0
            }), 200
        
        user_uuid = user_result.data[0]['id']
        print(f" Found user UUID: {user_uuid} for identifier: {user_identifier}")
        
        # Query notifications for this user
        user_notifications = supabase.table('notifications')\
            .select('*')\
            .eq('user_id', user_uuid)\
            .order('created_at', desc=True)\
            .limit(50)\
            .execute()
        
        all_notifications = user_notifications.data or []
        
        # Calculate unread count
        unread_count = len([n for n in all_notifications if not n['is_read']])
        
        return jsonify({
            'success': True,
            'notifications': all_notifications,
            'count': len(all_notifications),
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        print(f" Error getting notifications: {e}")
        return jsonify({'error': str(e)}), 500


# ===== CREATE a new notification (HTTP ENDPOINT) =====
@notifications_bp.route('/', methods=['POST'], strict_slashes=False)
def create_notification():
    """
    HTTP ENDPOINT: Create a new notification
    Used by frontend and external services
    """
    try:
        data = request.get_json()
        
        # Required fields
        user_id = data.get('user_id')
        notification_type = data.get('notification_type', 'info')
        title = data.get('title', '')
        message = data.get('message', '')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        if not title or not message:
            return jsonify({'error': 'title and message are required'}), 400
        
        print(f"📡 [HTTP] Creating notification via API for user_id: {user_id}")
        
        # Use the core function to create notification
        notification = _create_notification_core(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            metadata=data.get('metadata'),
            related_file_id=data.get('related_file_id'),
            related_user_id=data.get('related_user_id'),
            is_read=data.get('is_read', False)
        )
        
        if notification:
            return jsonify({
                'success': True,
                'notification': notification,
                'message': 'Notification created successfully'
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create notification in database'
            }), 500
        
    except Exception as e:
        print(f" Error in create_notification endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===== Mark Notification as Read =====
@notifications_bp.route('/<notification_id>/read', methods=['PUT'], strict_slashes=False)
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f" Marking notification {notification_id} as read for user: {user_id}")
        
        # Find user's UUID
        # Try to find by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            return jsonify({'error': f'User not found: {user_id}'}), 404
        
        user_uuid = user_result.data[0]['id']
        
        # Update the notification
        result = supabase.table('notifications')\
            .update({
                'is_read': True,
                'read_at': datetime.utcnow().isoformat() + 'Z'
            })\
            .eq('id', notification_id)\
            .eq('user_id', user_uuid)\
            .execute()
        
        if not result.data:
            return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify({
            'success': True,
            'notification': result.data[0]
        }), 200
        
    except Exception as e:
        print(f" Error marking notification as read: {e}")
        return jsonify({'error': str(e)}), 500


# ===== Mark All Notifications as Read =====
@notifications_bp.route('/mark-all-read', methods=['POST'], strict_slashes=False)
def mark_all_read():
    """Mark all notifications as read for a user"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f" Marking all notifications as read for user: {user_id}")
        
        # Find user's UUID
        # Try to find by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            return jsonify({'error': f'User not found: {user_id}'}), 404
        
        user_uuid = user_result.data[0]['id']
        
        # Mark all unread notifications for this user as read
        result = supabase.table('notifications')\
            .update({
                'is_read': True,
                'read_at': datetime.utcnow().isoformat() + 'Z'
            })\
            .eq('user_id', user_uuid)\
            .eq('is_read', False)\
            .execute()
        
        count = len(result.data) if result.data else 0
        
        return jsonify({
            'success': True,
            'count': count,
            'message': f'Marked {count} notifications as read'
        }), 200
        
    except Exception as e:
        print(f" Error marking all as read: {e}")
        return jsonify({'error': str(e)}), 500


# ===== Delete Notification =====
@notifications_bp.route('/<notification_id>', methods=['DELETE'], strict_slashes=False)
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f" Deleting notification {notification_id} for user: {user_id}")
        
        # Find user's UUID
        # Try to find by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            return jsonify({'error': f'User not found: {user_id}'}), 404
        
        user_uuid = user_result.data[0]['id']
        
        # Delete the notification
        result = supabase.table('notifications')\
            .delete()\
            .eq('id', notification_id)\
            .eq('user_id', user_uuid)\
            .execute()
        
        if not result.data:
            return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Notification deleted'
        }), 200
        
    except Exception as e:
        print(f" Error deleting notification: {e}")
        return jsonify({'error': str(e)}), 500


# ===== Clear All Notifications =====
@notifications_bp.route('/clear-all', methods=['POST'], strict_slashes=False)
def clear_all_notifications():
    """Clear all notifications for a user"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        print(f" Clearing all notifications for user: {user_id}")
        
        # Find user's UUID
        # Try to find by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            return jsonify({'error': f'User not found: {user_id}'}), 404
        
        user_uuid = user_result.data[0]['id']
        
        # Delete all notifications for this user
        result = supabase.table('notifications')\
            .delete()\
            .eq('user_id', user_uuid)\
            .execute()
        
        count = len(result.data) if result.data else 0
        
        return jsonify({
            'success': True,
            'count': count,
            'message': f'Cleared {count} notifications'
        }), 200
        
    except Exception as e:
        print(f" Error clearing all notifications: {e}")
        return jsonify({'error': str(e)}), 500


# ===== Get Unread Count =====
@notifications_bp.route('/unread-count', methods=['GET'], strict_slashes=False)
def get_unread_count():
    """Get count of unread notifications for a user"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Find user's UUID
        # Try to find by user_id field first
        user_result = supabase.table('users')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()
        
        if not user_result.data:
            # If not found by user_id, try by id field (UUID)
            user_result = supabase.table('users')\
                .select('id')\
                .eq('id', user_id)\
                .limit(1)\
                .execute()
        
        if not user_result.data:
            # If user not found, return 0
            return jsonify({
                'success': True,
                'unread_count': 0
            }), 200
        
        user_uuid = user_result.data[0]['id']
        
        # Get unread count for this user
        result = supabase.table('notifications')\
            .select('id', count='exact')\
            .eq('user_id', user_uuid)\
            .eq('is_read', False)\
            .execute()
        
        unread_count = result.count if result.count is not None else 0
        
        return jsonify({
            'success': True,
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        print(f" Error getting unread count: {e}")
        return jsonify({'error': str(e)}), 500


# ===== Health Check =====
@notifications_bp.route('/health', methods=['GET'], strict_slashes=False)
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'notifications',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200


# ===== Resolve user UUID from string ID or UUID =====
@notifications_bp.route('/resolve-user', methods=['GET'], strict_slashes=False)
def resolve_user():
    """Resolve a user's UUID given their string user_id or UUID.

    Query params:
        user_id: string user identifier (like 'JYDOC-67F') or UUID

    Returns:
        { success: True, found: bool, user: { id, user_id, full_name } }
    """
    try:
        user_identifier = request.args.get('user_id')
        if not user_identifier:
            return jsonify({'error': 'user_id is required'}), 400

        # Try to find by user_id field first, then by id (UUID)
        user_result = supabase.table('users')\
            .select('id, user_id, full_name')\
            .or_(f'user_id.eq.{user_identifier},id.eq.{user_identifier}')\
            .limit(1)\
            .execute()

        if not user_result.data:
            return jsonify({'success': True, 'found': False, 'user': None}), 200

        user = user_result.data[0]
        return jsonify({
            'success': True,
            'found': True,
            'user': {
                'id': user.get('id'),
                'user_id': user.get('user_id'),
                'full_name': user.get('full_name')
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
