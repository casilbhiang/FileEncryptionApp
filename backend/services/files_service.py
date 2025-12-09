"""
File Service - Handles all file-related database operations
Uses manual joins instead of relying on foreign key joins
"""

import re
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
    _uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
    
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
    
    @classmethod
    def _get_user_id_string(cls, user_uuid: str) -> Optional[str]:
        """
        Get user_id string (like 'PAT001') from UUID
        """
        try:
            supabase = cls._get_supabase()
            user_response = supabase.table('users')\
                .select('user_id')\
                .eq('id', user_uuid)\
                .single()\
                .execute()
            
            if user_response.data:
                return user_response.data.get('user_id')
        except Exception as e:
            logger.warning(f"Error getting user_id for UUID {user_uuid}: {str(e)}")
        return None
    
    @classmethod
    def _query_users_by_ids(cls, user_ids: List[str]) -> Dict[str, Dict]:
        """
        Query users by IDs (handles both UUID and user_id formats)
        Returns dictionary with both UUID and user_id as keys
        """
        if not user_ids:
            return {}
        
        users_dict = {}
        uuid_list = []
        user_id_list = []
        
        # Separate UUIDs from user_id strings
        for user_id in user_ids:
            if cls._uuid_pattern.match(user_id):
                uuid_list.append(user_id)
            else:
                user_id_list.append(user_id)
        
        supabase = cls._get_supabase()
        
        # Query for UUIDs
        if uuid_list:
            users_response = supabase.table('users')\
                .select('id, user_id, full_name, role, email')\
                .in_('id', uuid_list)\
                .execute()
            for user in users_response.data:
                users_dict[user['id']] = user
        
        # Query for user_id strings
        if user_id_list:
            users_by_id_response = supabase.table('users')\
                .select('id, user_id, full_name, role, email')\
                .in_('user_id', user_id_list)\
                .execute()
            for user in users_by_id_response.data:
                users_dict[user['user_id']] = user
                # Also store by UUID for consistency
                users_dict[user['id']] = user
        
        return users_dict
    
    @classmethod
    def _get_user_files_base(cls, user_id: str, search_query: str = "", limit: int = 1000) -> Dict[str, Any]:
        """
        BASE METHOD: Get all files for a user (owned + shared)
        Returns raw file data that can be formatted for different use cases
        """
        try:
            supabase = cls._get_supabase()
            
            # Get user_id string if user_id is UUID
            user_id_string = None
            if cls._uuid_pattern.match(user_id):
                user_id_string = cls._get_user_id_string(user_id)
            
            # ==================== 1. GET FILES UPLOADED BY USER ====================
            owned_files = []
            
            # Search by UUID in owner_id field
            query = supabase.table('encrypted_files')\
                .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')
            
            if search_query:
                query = query.ilike('original_filename', f'%{search_query}%')
            
            owned_by_uuid_response = query.order('uploaded_at', desc=True).limit(limit).execute()
            owned_files.extend(owned_by_uuid_response.data)
            
            # Also search by user_id if we have it
            if user_id_string:
                query = supabase.table('encrypted_files')\
                    .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                    .eq('owner_id', user_id_string)\
                    .eq('is_deleted', False)\
                    .eq('upload_status', 'completed')
                
                if search_query:
                    query = query.ilike('original_filename', f'%{search_query}%')
                
                owned_by_user_id_response = query.order('uploaded_at', desc=True).limit(limit).execute()
                owned_files.extend(owned_by_user_id_response.data)
            
            # Remove duplicates from owned files
            seen_owned_ids = set()
            unique_owned_files = []
            for file in owned_files:
                file_id = file['id']
                if file_id not in seen_owned_ids:
                    seen_owned_ids.add(file_id)
                    unique_owned_files.append(file)
            
            # ==================== 2. GET FILES SHARED WITH USER ====================
            shared_files_response = []
            
            # Search by UUID in shared_with field
            query = supabase.table('file_shares')\
                .select('file_id, shared_at, shared_by, shared_with, access_level')\
                .eq('shared_with', user_id)\
                .eq('share_status', 'active')
            
            shared_with_uuid_response = query.execute()
            shared_files_response.extend(shared_with_uuid_response.data)
            
            # Also search by user_id if we have it
            if user_id_string:
                query = supabase.table('file_shares')\
                    .select('file_id, shared_at, shared_by, shared_with, access_level')\
                    .eq('shared_with', user_id_string)\
                    .eq('share_status', 'active')
                
                shared_with_user_id_response = query.execute()
                shared_files_response.extend(shared_with_user_id_response.data)
            
            # Get unique file IDs from shares
            shared_file_ids = list(set([share['file_id'] for share in shared_files_response]))
            
            # Get the actual file details for shared files
            shared_files_details = []
            if shared_file_ids:
                query = supabase.table('encrypted_files')\
                    .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                    .in_('id', shared_file_ids)\
                    .eq('is_deleted', False)\
                    .eq('upload_status', 'completed')
                
                if search_query:
                    query = query.ilike('original_filename', f'%{search_query}%')
                
                shared_files_details_response = query.execute()
                shared_files_details = shared_files_details_response.data
            
            # Combine owned and shared files
            all_files = unique_owned_files + shared_files_details
            
            # Remove duplicates (files that might be both owned and shared)
            unique_files = {}
            for file in all_files:
                file_id = file['id']
                if file_id not in unique_files:
                    unique_files[file_id] = file
            
            # Get all file shares for these files
            all_file_ids = list(unique_files.keys())
            all_shares_response = supabase.table('file_shares')\
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
            
            # Get owner information for all files
            owner_ids = list(set([file['owner_id'] for file in unique_files.values()]))
            owners_dict = cls._query_users_by_ids(owner_ids)
            
            return {
                'unique_files': list(unique_files.values()),
                'shares_by_file': shares_by_file,
                'owners_dict': owners_dict,
                'shared_files_response': shared_files_response,
                'user_id': user_id
            }
            
        except Exception as e:
            logger.error(f"Error in _get_user_files_base: {str(e)}")
            return {
                'unique_files': [],
                'shares_by_file': {},
                'owners_dict': {},
                'shared_files_response': [],
                'user_id': user_id
            }
    
    # ==================== METHOD FOR DASHBOARD RECENT ACTIVITY ====================
    @staticmethod
    def get_recent_activity(user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get recent activity for both patients and doctors
        Uses the base method to get files, then formats as activity items
        """
        try:
            logger.info(f"Getting recent activity for user: {user_id}")
            
            # Get base file data (get extra files to ensure we have enough for filtering)
            base_data = FileService._get_user_files_base(user_id, limit=limit * 2)
            
            unique_files = base_data['unique_files']
            shares_by_file = base_data['shares_by_file']
            owners_dict = base_data['owners_dict']
            shared_files_response = base_data['shared_files_response']
            
            # ==================== CREATE ACTIVITY ITEMS ====================
            activity_items = []
            
            # From uploaded files
            for file in unique_files:
                activity_item = FileService._create_upload_activity_item(
                    file, owners_dict, user_id
                )
                if activity_item:
                    activity_items.append(activity_item)
            
            # Create shared_files_dict for lookup
            shared_files_dict = {file['id']: file for file in unique_files}
            
            # From shared files (only include shares involving this user)
            for share in shared_files_response:
                file_id = share['file_id']
                file_details = shared_files_dict.get(file_id)
                
                if file_details:
                    activity_item = FileService._create_share_activity_item(
                        share, file_details, owners_dict, user_id
                    )
                    if activity_item:
                        activity_items.append(activity_item)
            
            # Sort by timestamp (most recent first) and limit
            activity_items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
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
        Handles BOTH UUID and user_id formats in owner_id field
        """
        try:
            owner_id = file_data.get('owner_id')
            
            # Look up owner in users_dict - try both formats
            owner = users_dict.get(owner_id, {})
            
            # If not found by UUID, maybe it's a user_id - check if we have it
            if not owner and not FileService._uuid_pattern.match(owner_id):
                # owner_id might be a user_id, check if we have user info with that user_id
                for user in users_dict.values():
                    if user.get('user_id') == owner_id:
                        owner = user
                        break
            
            is_current_user = FileService._is_current_user(owner_id, current_user_id, users_dict)
            
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
    def _is_current_user(target_id: str, current_user_id: str, users_dict: Dict[str, Dict]) -> bool:
        """
        Check if target_id matches current_user_id, handling both UUID and user_id formats
        """
        # Direct string comparison first
        if str(target_id) == str(current_user_id):
            return True
        
        # If current_user_id is UUID, target might be user_id
        if FileService._uuid_pattern.match(current_user_id):
            # Check if target_id is in users_dict as user_id
            target_user = users_dict.get(target_id, {})
            if target_user and target_user.get('id') == current_user_id:
                return True
        else:
            # current_user_id is user_id, check if target_id matches its UUID
            for user in users_dict.values():
                if user.get('user_id') == current_user_id:
                    return str(target_id) == str(user.get('id'))
        
        return False
    
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
            
            is_current_user_shared_by = FileService._is_current_user(shared_by_id, current_user_id, users_dict)
            is_current_user_shared_with = FileService._is_current_user(shared_with_id, current_user_id, users_dict)
            is_current_user_owner = FileService._is_current_user(owner_id, current_user_id, users_dict)
            
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
    def get_files_with_shared_info(user_id: str, search_query: str = "", sort_by: str = "uploaded_at", 
                                   filter_type: str = "all", limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Get files with shared_at timestamp from file_shares table
        Uses the base method to get files, then formats with full details
        """
        try:
            logger.info(f"Getting files with shared info for user: {user_id}, search: '{search_query}', sort: {sort_by}, filter: {filter_type}")
            
            # Get base file data
            base_data = FileService._get_user_files_base(user_id, search_query, limit)
            
            unique_files = base_data['unique_files']
            shares_by_file = base_data['shares_by_file']
            owners_dict = base_data['owners_dict']
            
            # ==================== FORMAT FILES WITH ALL REQUIRED TIMESTAMPS ====================
            formatted_files = []
            for file in unique_files:
                file_id = file['id']
                owner_id = file['owner_id']
                
                # Get owner info
                owner = owners_dict.get(owner_id, {})
                
                # Get shared_at timestamp for this file and user
                shared_at = None
                is_shared = False
                
                # Check if user is the owner
                if FileService._is_current_user(owner_id, user_id, owners_dict):
                    # User is owner, check if they shared it with others
                    shares = shares_by_file.get(file_id, [])
                    # Find the most recent share where user is the sharer
                    user_shares = [s for s in shares if FileService._is_current_user(s['shared_by'], user_id, owners_dict)]
                    if user_shares:
                        # Get the most recent shared_at
                        user_shares.sort(key=lambda x: x.get('shared_at', ''), reverse=True)
                        shared_at = user_shares[0].get('shared_at')
                        is_shared = True
                else:
                    # User is not owner, check if file was shared with them
                    shares = shares_by_file.get(file_id, [])
                    user_shares = [s for s in shares if FileService._is_current_user(s['shared_with'], user_id, owners_dict)]
                    if user_shares:
                        # Get the most recent shared_at for this user
                        user_shares.sort(key=lambda x: x.get('shared_at', ''), reverse=True)
                        shared_at = user_shares[0].get('shared_at')
                        is_shared = True
                
                # Format file name
                file_extension = file.get('file_extension', '')
                original_filename = file.get('original_filename', 'Unknown File')
                display_name = FileService._format_filename(original_filename, file_extension)
                
                # Determine shared_by display
                if FileService._is_current_user(owner_id, user_id, owners_dict):
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
                    'shared_at': shared_at,
                    'last_accessed_at': None,
                    'is_shared': is_shared,
                    'file_size': file.get('file_size', 0),
                    'file_extension': file_extension,
                    'owner_id': owner_id,
                    'owner_name': owner.get('full_name', ''),
                    'owner_role': owner.get('role', '')
                }
                
                # Apply filter_type
                if filter_type == "all":
                    formatted_files.append(formatted_file)
                elif filter_type == "shared" and FileService._is_current_user(owner_id, user_id, owners_dict) and is_shared:
                    formatted_files.append(formatted_file)
                elif filter_type == "received" and not FileService._is_current_user(owner_id, user_id, owners_dict):
                    formatted_files.append(formatted_file)
            
            # Apply sorting
            if sort_by == 'uploaded_at':
                formatted_files.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
            elif sort_by == 'name':
                formatted_files.sort(key=lambda x: x.get('name', '').lower())
            elif sort_by == '-name':
                formatted_files.sort(key=lambda x: x.get('name', '').lower(), reverse=True)
            elif sort_by == 'size':
                formatted_files.sort(key=lambda x: x.get('file_size', 0))
            elif sort_by == '-size':
                formatted_files.sort(key=lambda x: x.get('file_size', 0), reverse=True)
            
            logger.info(f"Successfully formatted {len(formatted_files)} files for user {user_id}")
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
            
            response = supabase.table('users')\
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
        Convert user_id (like 'DOC001') to UUID OR return UUID directly if already in UUID format
        Supports BOTH formats: user_id (DOC001) and UUID (881f474f-1a5f-42ae-9643-3141bc0451c3)
        """
        try:
            supabase = FileService._get_supabase()
            
            # First, check if it's already a UUID
            if FileService._uuid_pattern.match(user_id_string):
                print(f"✅ Input is already a UUID: {user_id_string}")
                
                # Verify the UUID exists in the users table
                response = supabase.table('users')\
                    .select('id, user_id, full_name, role')\
                    .eq('id', user_id_string)\
                    .execute()
                
                if response.data and len(response.data) > 0:
                    print(f"✅ UUID verified in users table")
                    return user_id_string
                else:
                    print(f"⚠️ Warning: UUID {user_id_string} not found in users table")
                    return None
            
            # If not a UUID, search by user_id
            print(f"🔍 Looking up user_id: {user_id_string}")
            
            response = supabase.table('users')\
                .select('id, user_id, full_name, role')\
                .eq('user_id', user_id_string)\
                .execute()
            
            if response.data and len(response.data) > 0:
                uuid = response.data[0].get('id')
                user_name = response.data[0].get('full_name', 'Unknown')
                user_role = response.data[0].get('role', 'user')
                print(f"✅ Found user: {user_id_string} ({user_name} - {user_role}) → UUID: {uuid}")
                return uuid
            
            # Debug: List available users
            print(f"⚠️ Warning: No user found with user_id: {user_id_string}")
            print(f"   Checking available users in users table...")
            
            # List all users for debugging
            all_users = supabase.table('users')\
                .select('user_id, id, full_name, role')\
                .limit(20)\
                .execute()
            
            if all_users.data:
                print(f"   Available users ({len(all_users.data)}):")
                for user in all_users.data:
                    print(f"   - {user['user_id']}: {user['full_name']} ({user['role']}) - {user['id']}")
            else:
                print(f"   No users found in users table!")
            
            return None
            
        except Exception as e:
            print(f"❌ Error looking up user_id/UUID {user_id_string}: {str(e)}")
            return None
    
    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """
        Test Supabase connection
        """
        try:
            supabase = cls._get_supabase()
            
            response = supabase.table('users')\
                .select('id', count='exact')\
                .limit(1)\
                .execute()
            
            return {
                'connected': True,
                'user_count': response.count,
                'message': 'Database connection successful',
                'test_table': 'users'
            }
            
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return {
                'connected': False,
                'user_count': 0,
                'message': str(e)
            }