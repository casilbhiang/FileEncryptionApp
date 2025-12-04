"""
File Service - Handles all file-related database operations
Uses manual joins instead of relying on foreign key joins
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
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
    
    # ==================== NEW METHOD FOR UNIFIED RECENT ACTIVITY ====================
    @staticmethod
    def get_recent_activity(user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get recent activity for both patients and doctors
        Combines files they uploaded and files shared with them
        
        Args:
            user_id: UUID of the current user
            limit: Number of recent activities to return (default 3)
            
        Returns:
            List of activity items with type, file info, and timestamp
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
            # Create mapping of file_id to file details for shared files
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
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    # ==================== NEW HELPER METHODS FOR ACTIVITY ITEMS ====================
    @staticmethod
    def _create_upload_activity_item(file_data: Dict[str, Any], 
                                     users_dict: Dict[str, Dict], 
                                     current_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Create an activity item for a file upload
        """
        try:
            # Get owner info
            owner_id = file_data.get('owner_id')
            owner = users_dict.get(owner_id, {})
            
            # Determine if current user is the owner
            is_current_user = str(owner_id) == str(current_user_id)
            
            # Get file name for display
            file_extension = file_data.get('file_extension', '')
            original_filename = file_data.get('original_filename', 'Unknown File')
            display_name = FileService._format_filename(original_filename, file_extension)
            
            # Get detailed timestamp
            uploaded_at = file_data.get('uploaded_at')
            formatted_date = FileService._format_date_only(uploaded_at)
            formatted_time = FileService._format_time_only(uploaded_at)
            formatted_datetime = FileService._format_datetime_detailed(uploaded_at)
            
            # Create activity message based on role
            if is_current_user:
                # User uploaded their own file
                message = f"You uploaded {display_name}"
            else:
                # Someone else uploaded a file (shouldn't happen for uploads)
                owner_name = owner.get('full_name', 'Unknown User')
                message = f"{owner_name} uploaded {display_name}"
            
            return {
                'type': 'upload',
                'file_id': file_data.get('id'),
                'file_name': display_name,
                'message': message,
                'timestamp': uploaded_at,
                'formatted_date': formatted_date,
                'formatted_time': formatted_time,
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
            # Get user info
            shared_by_id = share_data.get('shared_by')
            shared_with_id = share_data.get('shared_with')
            owner_id = file_data.get('owner_id')
            
            shared_by_user = users_dict.get(shared_by_id, {})
            owner_user = users_dict.get(owner_id, {})
            
            # Determine roles
            is_current_user_shared_by = str(shared_by_id) == str(current_user_id)
            is_current_user_shared_with = str(shared_with_id) == str(current_user_id)
            is_current_user_owner = str(owner_id) == str(current_user_id)
            
            # Get file name for display
            file_extension = file_data.get('file_extension', '')
            original_filename = file_data.get('original_filename', 'Unknown File')
            display_name = FileService._format_filename(original_filename, file_extension)
            
            # Get detailed timestamp
            shared_at = share_data.get('shared_at')
            formatted_date = FileService._format_date_only(shared_at)
            formatted_time = FileService._format_time_only(shared_at)
            formatted_datetime = FileService._format_datetime_detailed(shared_at)
            
            # Create activity message based on different scenarios
            message = ""
            
            if is_current_user_shared_by:
                # User shared a file with someone
                shared_with_user = users_dict.get(shared_with_id, {})
                shared_with_name = shared_with_user.get('full_name', 'another user')
                message = f"You shared {display_name} with {shared_with_name}"
            elif is_current_user_shared_with:
                # User received a shared file
                shared_by_name = shared_by_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared {display_name} with you"
            elif is_current_user_owner:
                # User's file was shared (but not by them and not with them)
                shared_by_name = shared_by_user.get('full_name', 'another user')
                shared_with_user = users_dict.get(shared_with_id, {})
                shared_with_name = shared_with_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared your file {display_name} with {shared_with_name}"
            else:
                # User is neither owner, sharer, nor recipient (shouldn't normally happen)
                shared_by_name = shared_by_user.get('full_name', 'another user')
                message = f"{shared_by_name} shared {display_name}"
            
            return {
                'type': 'share',
                'file_id': file_data.get('id'),
                'file_name': display_name,
                'message': message,
                'timestamp': shared_at,
                'formatted_date': formatted_date,
                'formatted_time': formatted_time,
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
    
    # ==================== NEW HELPER METHODS FOR FORMATTING ====================
    @staticmethod
    def _format_filename(original_filename: str, file_extension: str) -> str:
        """
        Format filename with extension
        """
        if not original_filename:
            return 'Unknown File'
        
        display_name = original_filename
        if file_extension and not original_filename.lower().endswith(f".{file_extension.lower()}"):
            display_name = f"{original_filename}.{file_extension}"
        
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
            # Parse timestamp
            if timestamp.endswith('Z'):
                timestamp = timestamp[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(timestamp)
            
            # Format: "Jan 15, 2024 at 14:30:45"
            formatted = dt.strftime("%b %d, %Y at %H:%M:%S")
            
            return formatted
            
        except Exception as e:
            logger.warning(f"Could not parse timestamp {timestamp}: {str(e)}")
            return "Date unavailable"
    
    @staticmethod
    def _format_date_only(timestamp: Optional[str]) -> str:
        """
        Format timestamp to date only
        e.g., "Jan 15, 2024"
        """
        if not timestamp:
            return "Date unavailable"
        
        try:
            if timestamp.endswith('Z'):
                timestamp = timestamp[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(timestamp)
            
            # Format: "Jan 15, 2024"
            formatted = dt.strftime("%b %d, %Y")
            
            return formatted
            
        except Exception as e:
            logger.warning(f"Could not parse date {timestamp}: {str(e)}")
            return "Date unavailable"
    
    @staticmethod
    def _format_time_only(timestamp: Optional[str]) -> str:
        """
        Format timestamp to time only
        e.g., "14:30:45"
        """
        if not timestamp:
            return "Time unavailable"
        
        try:
            if timestamp.endswith('Z'):
                timestamp = timestamp[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(timestamp)
            
            # Format: "14:30:45" (24-hour format)
            formatted = dt.strftime("%H:%M:%S")
            
            return formatted
            
        except Exception as e:
            logger.warning(f"Could not parse time {timestamp}: {str(e)}")
            return "Time unavailable"
    
    # ==================== NEW METHOD FOR USER DISPLAY INFO ====================
    @staticmethod
    def get_user_display_info(user_id: str) -> Dict[str, str]:
        """
        Get user display information for the dashboard
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Dictionary with user display information
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
                
                # Create a welcome message based on role
                if role == 'doctor':
                    welcome = f"Dr. {full_name.split()[0]}" if 'Dr.' not in full_name else full_name
                elif role == 'patient':
                    welcome = full_name
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
    
    # ==================== EXISTING METHODS (KEEP THESE AS THEY ARE) ====================
    @staticmethod
    def get_recent_uploads_for_user(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent uploads for a user's dashboard
        Shows files owned by user with details of who they're shared with
        """
        try:
            logger.info(f"Fetching recent uploads for user: {user_id}")
            
            # Get Supabase client
            supabase = FileService._get_supabase()
            
            # 1. Get files owned by user
            files_response = supabase.table('encrypted_files')\
                .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .order('uploaded_at', desc=True)\
                .limit(limit)\
                .execute()
            
            if hasattr(files_response, 'error') and files_response.error:
                logger.error(f"Files query error: {files_response.error}")
                return []
            
            logger.info(f"Found {len(files_response.data)} files owned by user {user_id}")
            
            if not files_response.data:
                return []
            
            # 2. Get owner information from test_users table
            owner_ids = list(set([file['owner_id'] for file in files_response.data]))
            owners_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role, email')\
                .in_('id', owner_ids)\
                .execute()
            
            # Create owner lookup dictionary
            owners_dict = {owner['id']: owner for owner in owners_response.data}
            
            # 3. Get shares for these files from test_file_shares table
            file_ids = [file['id'] for file in files_response.data]
            shares_response = supabase.table('test_file_shares')\
                .select('id, file_id, shared_at, access_level, share_status, shared_by, shared_with')\
                .in_('file_id', file_ids)\
                .eq('share_status', 'active')\
                .execute()
            
            # 4. Get information about users who files are shared with
            shared_with_user_ids = list(set([share['shared_with'] for share in shares_response.data]))
            shared_with_users_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role')\
                .in_('id', shared_with_user_ids)\
                .execute() if shared_with_user_ids else {"data": []}
            
            # Create shared with users lookup dictionary
            shared_with_users_dict = {user['id']: user for user in shared_with_users_response.data}
            
            # 5. Organize shares by file_id with user details
            shares_dict = {}
            for share in shares_response.data:
                file_id = share['file_id']
                shared_with_id = share['shared_with']
                shared_with_user = shared_with_users_dict.get(shared_with_id, {})
                
                if file_id not in shares_dict:
                    shares_dict[file_id] = []
                
                # Add user details to the share
                share_with_user_details = dict(share)
                share_with_user_details['shared_with_user'] = shared_with_user
                shares_dict[file_id].append(share_with_user_details)
            
            # 6. Combine all data
            combined_files = []
            for file in files_response.data:
                file_id = file['id']
                owner_id = file['owner_id']
                
                # Add owner data from test_users
                file['owner'] = owners_dict.get(owner_id, {})
                
                # Add shares data with user details
                file['shares'] = shares_dict.get(file_id, [])
                
                combined_files.append(file)
            
            # 7. Format the data
            formatted_files = []
            for file in combined_files:
                formatted_file = FileService._format_file_data(file, user_id)
                if formatted_file:
                    formatted_files.append(formatted_file)
            
            logger.info(f"Successfully formatted {len(formatted_files)} files for user {user_id}")
            return formatted_files
            
        except Exception as e:
            logger.error(f"Error in get_recent_uploads_for_user: {str(e)}", exc_info=True)
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    @staticmethod
    def _format_file_data(file_data: Dict[str, Any], current_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Format raw database file data for frontend consumption
        Includes names of users the file is shared with
        """
        try:
            # Extract owner information (from test_users table)
            owner = file_data.get('owner', {})
            
            # Get owner_id from file_data if owner dict is empty
            owner_id = owner.get('id') or file_data.get('owner_id')
            
            if not owner_id:
                logger.warning(f"File {file_data.get('id')} has no owner_id")
                return None
            
            # Determine if current user is the owner
            is_owner = str(owner_id) == str(current_user_id)
            
            # Get owner name for display
            if is_owner:
                shared_by_display = 'you'
            elif owner:  # If we have owner data from test_users
                owner_name = owner.get('full_name', 'Unknown User')
                owner_role = owner.get('role', 'user')
                shared_by_display = f"{owner_name} ({owner_role})"
            else:
                shared_by_display = 'Unknown User'
            
            # Get shares with user details
            shares = file_data.get('shares', [])
            
            # Collect information about who the file is shared with
            shared_with_users = []
            share_count = 0
            
            # Track the most recent shared_at timestamp
            shared_at_timestamps = []
            
            for share in shares:
                if isinstance(share, dict):
                    share_status = share.get('share_status')
                    shared_by = share.get('shared_by')
                    shared_with_user = share.get('shared_with_user', {})
                    
                    # Only count active shares where current user is the sharer
                    if share_status == 'active' and str(shared_by) == str(current_user_id):
                        share_count += 1
                        
                        # Get shared_at timestamp
                        share_timestamp = share.get('shared_at')
                        if share_timestamp:
                            shared_at_timestamps.append(share_timestamp)
                        
                        # Get the name of the user this was shared with
                        if shared_with_user:
                            user_name = shared_with_user.get('full_name', 'Unknown User')
                            user_role = shared_with_user.get('role', 'user')
                            shared_with_users.append(f"{user_name} ({user_role})")
                        else:
                            shared_with_users.append("Unknown User")
            
            # Get the most recent shared_at timestamp
            shared_at = None
            if shared_at_timestamps:
                # Sort timestamps to get the most recent
                shared_at_timestamps.sort(reverse=True)
                shared_at = shared_at_timestamps[0]
            
            # Format date for frontend (e.g., "Last Edit May 03 2025")
            uploaded_at = file_data.get('uploaded_at')
            formatted_date = FileService._format_upload_date(uploaded_at)
            
            # Get file extension for display
            file_extension = file_data.get('file_extension', '')
            original_filename = file_data.get('original_filename', 'Unknown File')
            
            # Add file extension to name if not already included
            display_name = original_filename
            if file_extension and not original_filename.lower().endswith(file_extension.lower()):
                display_name = f"{original_filename}.{file_extension}"
            
            # Determine status text - show who it's shared with
            status = ''
            if share_count > 0:
                if share_count == 1:
                    # Show the single user's name
                    status = f"Shared with {shared_with_users[0]}"
                elif share_count == 2:
                    # Show both users' names
                    status = f"Shared with {shared_with_users[0]} and {shared_with_users[1]}"
                elif share_count == 3:
                    # Show first two and "1 other"
                    status = f"Shared with {shared_with_users[0]}, {shared_with_users[1]}, and 1 other"
                else:
                    # Show first two and count of others
                    others_count = share_count - 2
                    status = f"Shared with {shared_with_users[0]}, {shared_with_users[1]}, and {others_count} others"
            
            # Return formatted data matching your frontend structure
            return {
                'id': file_data.get('id'),
                'name': display_name,
                'sharedBy': shared_by_display,
                'status': status,
                'date': formatted_date,
                # TIMESTAMP FIELDS ADDED FOR MyFiles PAGE
                'uploaded_at': uploaded_at,  # From encrypted_files table
                'shared_at': shared_at,      # From test_file_shares table
                'last_accessed_at': FileService._get_last_accessed_timestamp(file_data.get('id'), current_user_id),
                'is_shared': share_count > 0,
                # Additional data
                'file_size': file_data.get('file_size', 0),
                'file_extension': file_extension,
                'share_count': share_count,
                'shared_with_users': shared_with_users,  # List of user display names
                'owner_id': owner_id,
                'owner_name': owner.get('full_name', ''),
                'owner_role': owner.get('role', ''),
                'owner_email': owner.get('email', '')
            }
            
        except Exception as e:
            logger.error(f"Error formatting file data: {str(e)}", exc_info=True)
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    @staticmethod
    def _get_last_accessed_timestamp(file_id: str, user_id: str) -> Optional[str]:
        """
        Get last accessed timestamp for a file by a user
        This would typically come from an access logs table
        For now, we'll use the uploaded_at as a fallback
        """
        # TODO: Implement actual last accessed tracking from access logs table
        # For now, return None or use uploaded_at as fallback
        return None
    
    @staticmethod
    def _format_upload_date(uploaded_at: Optional[str]) -> str:
        """
        Format uploaded_at timestamp to frontend format
        
        Args:
            uploaded_at: ISO format date string or None
            
        Returns:
            Formatted date string
        """
        if not uploaded_at:
            return "Last Edit Unknown date"
        
        try:
            # Handle different date formats from Supabase
            if uploaded_at.endswith('Z'):
                uploaded_at = uploaded_at[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(uploaded_at)
            
            # Format: "Last Edit May 03 2025"
            formatted_date = dt.strftime("Last Edit %b %d %Y")
            
            return formatted_date
            
        except Exception as e:
            logger.warning(f"Could not parse date {uploaded_at}: {str(e)}")
            return "Last Edit Unknown date"
    
    @staticmethod
    def get_files_with_shared_info(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get files with shared_at timestamp from test_file_shares table
        This method is specifically for the MyFiles page
        Returns files with all required timestamp fields
        """
        try:
            logger.info(f"Getting files with shared info for user: {user_id}")
            
            # Get Supabase client
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
                
                # Format file name
                file_extension = file.get('file_extension', '')
                original_filename = file.get('original_filename', 'Unknown File')
                display_name = original_filename
                if file_extension and not original_filename.lower().endswith(file_extension.lower()):
                    display_name = f"{original_filename}.{file_extension}"
                
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
            import traceback
            logger.error(traceback.format_exc())
            # Fallback to recent uploads method
            return FileService.get_recent_uploads_for_user(user_id, limit)
    
    @staticmethod
    def get_file_by_id(file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific file if the user has access to it
        Uses manual joins with test_users and test_file_shares tables
        """
        try:
            logger.info(f"Fetching file {file_id} for user {user_id}")
            
            supabase = FileService._get_supabase()
            
            # 1. Get the file
            response = supabase.table('encrypted_files')\
                .select('id, original_filename, file_size, file_extension, uploaded_at, upload_status, owner_id, is_deleted')\
                .eq('id', file_id)\
                .eq('is_deleted', False)\
                .single()\
                .execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Supabase error for file {file_id}: {response.error}")
                return None
            
            file_data = response.data
            
            # 2. Get owner information from test_users
            owner_id = file_data.get('owner_id')
            owners_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role')\
                .eq('id', owner_id)\
                .execute()
            
            # 3. Get shares from test_file_shares
            shares_response = supabase.table('test_file_shares')\
                .select('id, file_id, shared_at, access_level, share_status, shared_by, shared_with')\
                .eq('file_id', file_id)\
                .execute()
            
            # 4. Get user details for shared_with users
            shared_with_ids = list(set([share['shared_with'] for share in shares_response.data]))
            shared_with_users_response = supabase.table('test_users')\
                .select('id, user_id, full_name, role')\
                .in_('id', shared_with_ids)\
                .execute() if shared_with_ids else {"data": []}
            
            shared_with_users_dict = {user['id']: user for user in shared_with_users_response.data}
            
            # 5. Combine shares with user details
            shares_with_details = []
            for share in shares_response.data:
                share_with_details = dict(share)
                shared_with_id = share['shared_with']
                share_with_details['shared_with_user'] = shared_with_users_dict.get(shared_with_id, {})
                shares_with_details.append(share_with_details)
            
            # Combine data
            file_data['owner'] = owners_response.data[0] if owners_response.data else {}
            file_data['shares'] = shares_with_details
            
            # Check if user has access
            owner_id = file_data.get('owner_id')
            shares = file_data.get('shares', [])
            
            has_access = False
            if str(owner_id) == str(user_id):
                has_access = True
                logger.debug(f"User {user_id} is owner of file {file_id}")
            else:
                for share in shares:
                    if isinstance(share, dict):
                        if str(share.get('shared_with')) == str(user_id) and share.get('share_status') == 'active':
                            has_access = True
                            logger.debug(f"User {user_id} has shared access to file {file_id}")
                            break
            
            if not has_access:
                logger.warning(f"User {user_id} has no access to file {file_id}")
                return None
            
            return FileService._format_file_data(file_data, user_id)
            
        except Exception as e:
            logger.error(f"Error in get_file_by_id: {str(e)}", exc_info=True)
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    @staticmethod
    def get_user_files_statistics(user_id: str) -> Dict[str, Any]:
        """
        Get statistics about user's files
        Uses test_file_shares table for shared files count
        """
        try:
            supabase = FileService._get_supabase()
            
            # Get total files owned by user
            owned_response = supabase.table('encrypted_files')\
                .select('id', count='exact')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .execute()
            
            # Get files shared with user from test_file_shares table
            shared_response = supabase.table('test_file_shares')\
                .select('id', count='exact')\
                .eq('shared_with', user_id)\
                .eq('share_status', 'active')\
                .execute()
            
            total_owned = owned_response.count if hasattr(owned_response, 'count') else 0
            total_shared = shared_response.count if hasattr(shared_response, 'count') else 0
            
            return {
                'total_owned': total_owned,
                'total_shared': total_shared,
                'total_files': total_owned + total_shared
            }
            
        except Exception as e:
            logger.error(f"Error in get_user_files_statistics: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {'total_owned': 0, 'total_shared': 0, 'total_files': 0}
    
    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """
        Test Supabase connection
        Returns connection status and basic info
        """
        try:
            supabase = cls._get_supabase()
            
            # Test with a simple query to test_users table
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
            import traceback
            logger.error(traceback.format_exc())
            return {
                'connected': False,
                'user_count': 0,
                'message': str(e)
            }
    
    @staticmethod
    def _get_uuid_from_user_id(user_id_string: str) -> Optional[str]:
        """
        Convert user_id (like 'DOC001') to UUID
        
        Args:
            user_id_string: The user_id from login (e.g., 'DOC001')
            
        Returns:
            UUID string or None
        """
        try:
            supabase = FileService._get_supabase()
            
            # Look up the UUID using the user_id in test_users table
            response = supabase.table('test_users')\
                .select('id')\
                .eq('user_id', user_id_string)\
                .single()\
                .execute()
            
            if response.data:
                return response.data.get('id')
            
            logger.warning(f"No user found with user_id: {user_id_string} in test_users table")
            return None
            
        except Exception as e:
            logger.error(f"Error looking up UUID for user_id {user_id_string}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    @staticmethod
    def get_users_lookup() -> Dict[str, Dict[str, str]]:
        """
        Get a lookup dictionary of all users for quick reference
        Returns: {user_id: {'full_name': '...', 'role': '...'}}
        """
        try:
            supabase = FileService._get_supabase()
            
            response = supabase.table('test_users')\
                .select('id, user_id, full_name, role, email')\
                .execute()
            
            users_lookup = {}
            for user in response.data:
                users_lookup[user['id']] = {
                    'user_id': user.get('user_id'),
                    'full_name': user.get('full_name'),
                    'role': user.get('role'),
                    'email': user.get('email')
                }
            
            return users_lookup
            
        except Exception as e:
            logger.error(f"Error getting users lookup: {str(e)}")
            return {}