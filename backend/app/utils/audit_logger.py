"""
Audit logging utility for tracking all system activities
"""
from app.utils.supabase_client import get_supabase_admin_client
from typing import Optional, Dict, Any
import json


def log_audit(
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    result: str = 'success',
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log an audit event to the audit_logs table

    Args:
        user_id: UUID of the user performing the action (can be None for system actions)
        action: The action being performed (e.g., 'file_upload', 'file_delete', 'user_created')
        resource_type: Type of resource affected (e.g., 'file', 'user', 'key')
        resource_id: ID of the specific resource
        details: Additional human-readable details
        result: 'success' or 'failure'
        error_message: Error message if result is 'failure'
        metadata: Additional structured data as a dictionary

    Returns:
        True if logging succeeded, False otherwise
    """
    try:
        supabase = get_supabase_admin_client()

        # Prepare log entry
        log_entry = {
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details,
            'result': result,
            'error_message': error_message,
        }

        # Add user_id if provided
        if user_id:
            log_entry['user_id'] = user_id

        # Add metadata if provided
        if metadata:
            log_entry['metadata'] = json.dumps(metadata) if not isinstance(metadata, str) else metadata

        # Insert into audit_logs table
        response = supabase.table('audit_logs').insert(log_entry).execute()

        return response.data is not None and len(response.data) > 0

    except Exception as e:
        print(f"Failed to log audit event: {e}")
        import traceback
        traceback.print_exc()
        return False


# Convenience functions for common audit events

def log_file_upload(user_id: str, filename: str, file_id: str, success: bool = True, error: Optional[str] = None):
    """Log file upload event"""
    return log_audit(
        user_id=user_id,
        action='file_upload',
        resource_type='file',
        resource_id=file_id,
        details=f"Uploaded file: {filename}",
        result='success' if success else 'failure',
        error_message=error
    )


def log_file_download(user_id: str, filename: str, file_id: str, success: bool = True, error: Optional[str] = None):
    """Log file download event"""
    return log_audit(
        user_id=user_id,
        action='file_download',
        resource_type='file',
        resource_id=file_id,
        details=f"Downloaded file: {filename}",
        result='success' if success else 'failure',
        error_message=error
    )


def log_file_delete(user_id: str, filename: str, file_id: str, success: bool = True, error: Optional[str] = None):
    """Log file deletion event"""
    return log_audit(
        user_id=user_id,
        action='file_delete',
        resource_type='file',
        resource_id=file_id,
        details=f"Deleted file: {filename}",
        result='success' if success else 'failure',
        error_message=error
    )


def log_file_share(user_id: str, filename: str, file_id: str, shared_with: str, success: bool = True, error: Optional[str] = None):
    """Log file sharing event"""
    return log_audit(
        user_id=user_id,
        action='file_share',
        resource_type='file',
        resource_id=file_id,
        details=f"Shared file '{filename}' with {shared_with}",
        result='success' if success else 'failure',
        error_message=error,
        metadata={'shared_with': shared_with}
    )


def log_user_created(admin_user_id: str, new_user_id: str, new_user_email: str, role: str, success: bool = True, error: Optional[str] = None):
    """Log user creation event"""
    return log_audit(
        user_id=admin_user_id,
        action='user_created',
        resource_type='user',
        resource_id=new_user_id,
        details=f"Created {role} user: {new_user_email}",
        result='success' if success else 'failure',
        error_message=error,
        metadata={'email': new_user_email, 'role': role}
    )


def log_user_updated(admin_user_id: str, target_user_id: str, changes: Dict[str, Any], success: bool = True, error: Optional[str] = None):
    """Log user update event"""
    return log_audit(
        user_id=admin_user_id,
        action='user_updated',
        resource_type='user',
        resource_id=target_user_id,
        details=f"Updated user {target_user_id}",
        result='success' if success else 'failure',
        error_message=error,
        metadata=changes
    )


def log_user_deleted(admin_user_id: str, target_user_id: str, target_user_email: str, success: bool = True, error: Optional[str] = None):
    """Log user deletion event"""
    return log_audit(
        user_id=admin_user_id,
        action='user_deleted',
        resource_type='user',
        resource_id=target_user_id,
        details=f"Deleted user: {target_user_email}",
        result='success' if success else 'failure',
        error_message=error
    )


def log_key_generated(user_id: str, key_type: str, key_id: str, success: bool = True, error: Optional[str] = None):
    """Log encryption key generation event"""
    return log_audit(
        user_id=user_id,
        action='key_generated',
        resource_type='key',
        resource_id=key_id,
        details=f"Generated {key_type} key",
        result='success' if success else 'failure',
        error_message=error,
        metadata={'key_type': key_type}
    )


def log_permission_change(admin_user_id: str, target_user_id: str, permission_details: str, success: bool = True, error: Optional[str] = None):
    """Log permission/access control change"""
    return log_audit(
        user_id=admin_user_id,
        action='permission_change',
        resource_type='permission',
        resource_id=target_user_id,
        details=permission_details,
        result='success' if success else 'failure',
        error_message=error
    )
