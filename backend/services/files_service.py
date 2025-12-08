"""
File Service - Handles all file-related database operations
Uses manual joins instead of relying on foreign key joins
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
import os
from supabase import create_client, Client

# Set up logging
logger = logging.getLogger(__name__)

class FileService:
    """
    Service layer for file operations
    Contains all direct Supabase queries for files
    """
    
    # Class-level Supabase client (shared instance)
    _supabase_client = None
    
    @classmethod
    def _get_supabase(cls) -> Client:
        """
        Initialize and return Supabase client
        Uses credentials from your .env file
        """
        if cls._supabase_client is None:
            # Get credentials from your existing .env file
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for full access
            
            if not supabase_url or not supabase_key:
                logger.error("Missing Supabase credentials in .env file")
                raise ValueError(
                    "Supabase credentials not found. Make sure your .env file has:\n"
                    "SUPABASE_URL=https://your-project.supabase.co\n"
                    "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
                )
            
            cls._supabase_client = create_client(supabase_url, supabase_key)
            logger.info(f"Supabase client initialized for: {supabase_url}")
        
        return cls._supabase_client
    
    # ==================== METHOD FOR DASHBOARD RECENT ACTIVITY ====================
    @staticmethod
    def get_recent_activity(user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get recent activity for both patients and doctors
        Combines files they uploaded and files shared with them
        """
        try:
            logger.info(f"Getting recent activity for user: {user_id}")
            
            supabase = FileService._get_supabase()
            
            # 1. Get files uploaded by the user (most recent first)
            uploaded_files_response = supabase.table('encrypted_files')\
                .select('id, original_filename, file_extension, uploaded_at, owner_id')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .order('uploaded_at', desc=True)\
                .limit(limit)\
                .execute()
            
            # 2. Get files shared with the user (most recent shares first)
            shared_files_response = supabase.table('test_file_shares')\
                .select('file_id, shared_at, shared_by, shared_with, access_level')\
                .eq('shared_with', user_id)\
                .eq('share_status', 'active')\
                .order('shared_at', desc=True)\
                .limit(limit)\
                .execute()
            
            # 3. Get file details for shared files
            shared_file_ids = [share['file_id'] for share in shared_files_response.data]
            shared_files_details = []
            
            if shared_file_ids:
                shared_files_details_response = supabase.table('encrypted_files')\
                    .select('id, original_filename, file_extension, uploaded_at, owner_id')\
                    .in_('id', shared_file_ids)\
                    .eq('is_deleted', False)\
                    .eq('upload_status', 'completed')\
                    .execute()
                
                shared_files_details = shared_files_details_response.data
            
            # 4. Get user information for owners and sharers
            all_user_ids = set()
            
            # Add owner IDs from uploaded files
            for file in uploaded_files_response.data:
                all_user_ids.add(file['owner_id'])
            
            # Add shared_by IDs from shares
            for share in shared_files_response.data:
                all_user_ids.add(share['shared_by'])
            
            # Add owner IDs from shared files
            for file in shared_files_details:
                all_user_ids.add(file['owner_id'])
            
            users_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role, email')\
                .in_('id', list(all_user_ids))\
                .execute() if all_user_ids else {"data": []}
            
            users_dict = {user['id']: user for user in users_response.data}
            
            # 5. Create activity items from uploaded files
            activity_items = []
            
            for file in uploaded_files_response.data:
                activity_item = FileService._create_upload_activity_item(
                    file, users_dict, user_id
                )
                if activity_item:
                    activity_items.append(activity_item)
            
            # 6. Create activity items from shared files
            shared_files_dict = {file['id']: file for file in shared_files_details}
            
            for share in shared_files_response.data:
                file_id = share['file_id']
                file_details = shared_files_dict.get(file_id)
                
                if file_details:
                    activity_item = FileService._create_share_activity_item(
                        share, file_details, users_dict, user_id
                    )
                    if activity_item:
                        activity_items.append(activity_item)
            
            # 7. Sort all activity items by timestamp (most recent first)
            activity_items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            # 8. Return only the most recent items up to limit
            recent_activity = activity_items[:limit]
            
            logger.info(f"Found {len(recent_activity)} recent activities for user {user_id}")
            return recent_activity
            
        except Exception as e:
            logger.error(f"Error in get_recent_activity: {str(e)}", exc_info=True)
            return []
    
    @staticmethod
    def _create_upload_activity_item(file_data: Dict[str, Any], 
                                     users_dict: Dict[str, Dict], 
                                     current_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Create an activity item for a file upload
        """
        try:
            owner_id = file_data.get('owner_id')
            owner = users_dict.get(owner_id, {})
            is_current_user = str(owner_id) == str(current_user_id)
            
            file_extension = file_data.get('file_extension', '')
            original_filename = file_data.get('original_filename', 'Unknown File')
            display_name = FileService._format_filename(original_filename, file_extension)
            
            uploaded_at = file_data.get('uploaded_at')
            formatted_datetime = FileService._format_datetime_detailed(uploaded_at)
            
            if is_current_user:
                message = f"You uploaded {display_name}"
            else:
                owner_name = owner.get('full_name', 'Unknown User')
                message = f"{owner_name} uploaded {display_name}"
            
            return {
                'type': 'upload',
                'file_id': file_data.get('id'),
                'file_name': display_name,
                'message': message,
                'timestamp': uploaded_at,
                'formatted_datetime': formatted_datetime,
                'action_by': owner_id if not is_current_user else current_user_id,
                'action_by_name': owner.get('full_name', '') if not is_current_user else 'You',
                'action_by_role': owner.get('role', '') if not is_current_user else '',
                'icon': 'upload'
            }
            
        except Exception as e:
            logger.error(f"Error creating upload activity item: {str(e)}")
            return None
    
    @staticmethod
    def _create_share_activity_item(share_data: Dict[str, Any], 
                                    file_data: Dict[str, Any],
                                    users_dict: Dict[str, Dict],
                                    current_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Create an activity item for a file share
        """
        try:
            shared_by_id = share_data.get('shared_by')
            shared_with_id = share_data.get('shared_with')
            owner_id = file_data.get('owner_id')
            
            shared_by_user = users_dict.get(shared_by_id, {})
            
            is_current_user_shared_by = str(shared_by_id) == str(current_user_id)
            is_current_user_shared_with = str(shared_with_id) == str(current_user_id)
            is_current_user_owner = str(owner_id) == str(current_user_id)
            
            file_extension = file_data.get('file_extension', '')
            original_filename = file_data.get('original_filename', 'Unknown File')
            display_name = FileService._format_filename(original_filename, file_extension)
            
            shared_at = share_data.get('shared_at')
            formatted_datetime = FileService._format_datetime_detailed(shared_at)
            
            message = ""
            
            if is_current_user_shared_by:
                shared_with_user = users_dict.get(shared_with_id, {})
                shared_with_name = shared_with_user.get('full_name', 'another user')
                message = f"You shared {display_name} with {shared_with_name}"
            elif is_current_user_shared_with:
                shared_by_name = shared_by_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared {display_name} with you"
            elif is_current_user_owner:
                shared_by_name = shared_by_user.get('full_name', 'another user')
                shared_with_user = users_dict.get(shared_with_id, {})
                shared_with_name = shared_with_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared your file {display_name} with {shared_with_name}"
            else:
                shared_by_name = shared_by_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared {display_name}"
            
            return {
                'type': 'share',
                'file_id': file_data.get('id'),
                'file_name': display_name,
                'message': message,
                'timestamp': shared_at,
                'formatted_datetime': formatted_datetime,
                'action_by': shared_by_id,
                'action_by_name': shared_by_user.get('full_name', ''),
                'action_by_role': shared_by_user.get('role', ''),
                'shared_with': shared_with_id,
                'access_level': share_data.get('access_level', 'view'),
                'icon': 'share'
            }
            
        except Exception as e:
            logger.error(f"Error creating share activity item: {str(e)}")
            return None
    
    # ==================== METHOD FOR MyFiles PAGE ====================
    @staticmethod
    def get_files_with_shared_info(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get files with shared_at timestamp from test_file_shares table
        This method is specifically for the MyFiles page
        Returns files with all required timestamp fields
        """
        try:
            logger.info(f"Getting files with shared info for user: {user_id}")
            
            supabase = FileService._get_supabase()
            
            # 1. Get files owned by user OR shared with user
            # First, get files owned by user
            owned_files_response = supabase.table('encrypted_files')\
                .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .order('uploaded_at', desc=True)\
                .limit(limit)\
                .execute()
            
            # 2. Get files shared with user from test_file_shares
            shared_files_response = supabase.table('test_file_shares')\
                .select('file_id, shared_at, shared_by, shared_with')\
                .eq('shared_with', user_id)\
                .eq('share_status', 'active')\
                .execute()
            
            # Get unique file IDs from shares
            shared_file_ids = list(set([share['file_id'] for share in shared_files_response.data]))
            
            # Get the actual file details for shared files
            shared_files_details_response = supabase.table('encrypted_files')\
                .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                .in_('id', shared_file_ids)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .execute()
            
            # Combine owned and shared files
            all_files = owned_files_response.data + shared_files_details_response.data
            
            # Remove duplicates (files that might be both owned and shared)
            unique_files = {}
            for file in all_files:
                file_id = file['id']
                if file_id not in unique_files:
                    unique_files[file_id] = file
            
            # Get owner information for all files
            owner_ids = list(set([file['owner_id'] for file in unique_files.values()]))
            owners_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role, email')\
                .in_('id', owner_ids)\
                .execute()
            
            # Create owner lookup dictionary
            owners_dict = {owner['id']: owner for owner in owners_response.data}
            
            # Get all file shares for these files
            all_file_ids = list(unique_files.keys())
            all_shares_response = supabase.table('test_file_shares')\
                .select('id, file_id, shared_at, access_level, share_status, shared_by, shared_with')\
                .in_('file_id', all_file_ids)\
                .eq('share_status', 'active')\
                .execute()
            
            # Organize shares by file_id
            shares_by_file = {}
            for share in all_shares_response.data:
                file_id = share['file_id']
                if file_id not in shares_by_file:
                    shares_by_file[file_id] = []
                shares_by_file[file_id].append(share)
            
            # Format the data with all required timestamps
            formatted_files = []
            for file in unique_files.values():
                file_id = file['id']
                owner_id = file['owner_id']
                
                # Get owner info
                owner = owners_dict.get(owner_id, {})
                
                # Get shared_at timestamp for this file and user
                shared_at = None
                is_shared = False
                
                # Check if user is the owner
                if str(owner_id) == str(user_id):
                    # User is owner, check if they shared it with others
                    shares = shares_by_file.get(file_id, [])
                    # Find the most recent share where user is the sharer
                    user_shares = [s for s in shares if str(s['shared_by']) == str(user_id)]
                    if user_shares:
                        # Get the most recent shared_at
                        user_shares.sort(key=lambda x: x.get('shared_at', ''), reverse=True)
                        shared_at = user_shares[0].get('shared_at')
                        is_shared = True
                else:
                    # User is not owner, check if file was shared with them
                    shares = shares_by_file.get(file_id, [])
                    user_shares = [s for s in shares if str(s['shared_with']) == str(user_id)]
                    if user_shares:
                        # Get the most recent shared_at for this user
                        user_shares.sort(key=lambda x: x.get('shared_at', ''), reverse=True)
                        shared_at = user_shares[0].get('shared_at')
                        is_shared = True
                
                # Format file name using the helper method
                file_extension = file.get('file_extension', '')
                original_filename = file.get('original_filename', 'Unknown File')
                display_name = FileService._format_filename(original_filename, file_extension)
                
                # Determine shared_by display
                if str(owner_id) == str(user_id):
                    shared_by_display = 'You'
                else:
                    owner_name = owner.get('full_name', 'Unknown User')
                    owner_role = owner.get('role', 'user')
                    shared_by_display = f"{owner_name} ({owner_role})"
                
                formatted_file = {
                    'id': file_id,
                    'name': display_name,
                    'shared_by': shared_by_display,
                    'uploaded_at': file.get('uploaded_at'),
                    'shared_at': shared_at,  # From test_file_shares table
                    'last_accessed_at': None,  # TODO: Implement from access logs
                    'is_shared': is_shared,
                    'file_size': file.get('file_size', 0),
                    'file_extension': file_extension,
                    'owner_id': owner_id,
                    'owner_name': owner.get('full_name', ''),
                    'owner_role': owner.get('role', '')
                }
                
                formatted_files.append(formatted_file)
            
            # Sort by uploaded_at (most recent first)
            formatted_files.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
            
            logger.info(f"Successfully formatted {len(formatted_files)} files with shared info for user {user_id}")
            return formatted_files[:limit]
            
        except Exception as e:
            logger.error(f"Error in get_files_with_shared_info: {str(e)}", exc_info=True)
            return []
    
    # ==================== HELPER METHODS ====================
    @staticmethod
    def _format_filename(original_filename: str, file_extension: str) -> str:
        """
        Format filename with extension
        """
        if not original_filename:
            return 'Unknown File'
        
        # Clean the file_extension - remove leading dot if present
        clean_extension = file_extension
        if clean_extension and clean_extension.startswith('.'):
            clean_extension = clean_extension[1:]
        
        display_name = original_filename
        
        if clean_extension:
            original_lower = original_filename.lower()
            ext_lower = clean_extension.lower()
            
            # Remove any trailing dots from the original filename first
            original_clean = original_filename.rstrip('.')
            
            # Check if the filename already ends with the extension
            # Check for: .ext, ext, .EXT, EXT
            if (not original_lower.endswith(f".{ext_lower}") and 
                not original_lower == ext_lower and
                not original_lower.endswith(ext_lower)):
                # Only add extension if not already there
                display_name = f"{original_clean}.{clean_extension}"
            else:
                # If extension is already there, just use the original
                display_name = original_filename
        
        return display_name
    
    @staticmethod
    def _format_datetime_detailed(timestamp: Optional[str]) -> str:
        """
        Format timestamp to detailed date and time
        e.g., "Jan 15, 2024 at 14:30:45"
        """
        if not timestamp:
            return "Date unavailable"
        
        try:
            if timestamp.endswith('Z'):
                timestamp = timestamp[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(timestamp)
            return dt.strftime("%b %d, %Y at %H:%M:%S")
            
        except Exception as e:
            logger.warning(f"Could not parse timestamp {timestamp}: {str(e)}")
            return "Date unavailable"
    
    @staticmethod
    def get_user_display_info(user_id: str) -> Dict[str, str]:
        """
        Get user display information for the dashboard
        """
        try:
            supabase = FileService._get_supabase()
            
            response = supabase.table('test_users')\
                .select('user_id, full_name, role, email')\
                .eq('id', user_id)\
                .single()\
                .execute()
            
            if response.data:
                user_data = response.data
                role = user_data.get('role', 'user')
                full_name = user_data.get('full_name', 'User')
                
                if role == 'doctor':
                    welcome = f"Dr. {full_name.split()[0]}" if 'Dr.' not in full_name else full_name
                else:
                    welcome = full_name
                
                return {
                    'user_id': user_data.get('user_id', ''),
                    'full_name': full_name,
                    'role': role,
                    'email': user_data.get('email', ''),
                    'welcome_message': f"Welcome back, {welcome}!",
                    'dashboard_title': f"{role.title()} Dashboard"
                }
            
            return {
                'user_id': '',
                'full_name': 'User',
                'role': 'user',
                'email': '',
                'welcome_message': 'Welcome!',
                'dashboard_title': 'Dashboard'
            }
            
        except Exception as e:
            logger.error(f"Error getting user display info: {str(e)}")
            return {
                'user_id': '',
                'full_name': 'User',
                'role': 'user',
                'email': '',
                'welcome_message': 'Welcome!',
                'dashboard_title': 'Dashboard'
            }
    
    @staticmethod
    def _get_uuid_from_user_id(user_id_string: str) -> Optional[str]:
        """
        Convert user_id (like 'DOC001') to UUID
        """
        try:
            supabase = FileService._get_supabase()
            
            response = supabase.table('test_users')\
                .select('id')\
                .eq('user_id', user_id_string)\
                .single()\
                .execute()
            
            if response.data:
                return response.data.get('id')
            
            logger.warning(f"No user found with user_id: {user_id_string}")
            return None
            
        except Exception as e:
            logger.error(f"Error looking up UUID for user_id {user_id_string}: {str(e)}")
            return None
    
    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """
        Test Supabase connection
        """
        try:
            supabase = cls._get_supabase()
            
            response = supabase.table('test_users')\
                .select('id', count='exact')\
                .limit(1)\
                .execute()
            
            return {
                'connected': True,
                'user_count': response.count,
                'message': 'Database connection successful',
                'test_table': 'test_users'
            }
            
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return {
                'connected': False,
                'user_count': 0,
                'message': str(e)
            }