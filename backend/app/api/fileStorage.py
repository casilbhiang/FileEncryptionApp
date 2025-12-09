"""
File Storage API Routes
Unified endpoint for file storage operations
Handles both DHomePage (recent activity) and MyFiles (full library with filters)

NOW SUPPORTS BOTH AUTHENTICATION METHODS:
1. X-User-ID header (preferred for unified endpoint)
2. user_id query parameter (for backward compatibility with Files.ts)
"""

from flask import Blueprint, jsonify, request
import os
import traceback
from datetime import datetime
from typing import Dict, Any
from services.files_service import FileService

# Create blueprint
fileStorage_bp = Blueprint('file_storage', __name__)

@fileStorage_bp.route('/api/file-storage', methods=['GET', 'OPTIONS'])
def get_file_storage():
    """
    Unified file storage endpoint
    
    For DHomePage (recent activity):
      GET /api/file-storage?mode=recent&limit=10
    
    For MyFiles (full library with filters):
      GET /api/file-storage?mode=library&search=report&sort_by=name&page=1&limit=20
    
    Authentication: Supports BOTH methods:
      - X-User-ID header (recommended)
      - user_id query parameter (backward compatibility)
    
    Parameters:
      mode (str): 'recent' or 'library' (default: 'recent' for backward compatibility)
      limit (int): Number of results (default: 10)
      page (int): Page number (default: 1, for library mode only)
      search (str): Search in filename (library mode only)
      sort_by (str): 'uploaded_at', 'name', or 'size' (library mode only)
      sort_order (str): 'asc' or 'desc' (library mode only)
      file_type (str): Filter by extension like '.pdf' (library mode only)
      shared_status (str): 'all', 'shared', 'owned' (library mode only)
      filter (str): Alternative to shared_status: 'all', 'shared', 'received' (library mode only)
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'X-User-ID, Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        return response, 200
    
    try:
        # ==================== GET USER ID (SUPPORTS BOTH METHODS) ====================
        # Method 1: Try to get user ID from header (new unified way)
        user_id_string = request.headers.get('X-User-ID')
        auth_method = 'header' if user_id_string else None
        
        # Method 2: If not in header, try query param (backward compatibility)
        if not user_id_string:
            user_id_string = request.args.get('user_id')
            auth_method = 'query_param' if user_id_string else None
        
        # Method 3: If still not found, check for 'user' param (another possible name)
        if not user_id_string:
            user_id_string = request.args.get('user')
            auth_method = 'query_param' if user_id_string else None
        
        if not user_id_string:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'message': 'Missing user identification. Provide either:',
                'options': [
                    'X-User-ID header (recommended)',
                    'user_id query parameter',
                    'user query parameter'
                ]
            }), 401
        
        print(f"🔑 Authentication method: {auth_method}, User ID provided: {user_id_string}")
        
        # ==================== CONVERT USER ID TO UUID (SIMPLIFIED) ====================
        # Let FileService handle both formats (user_id or UUID)
        user_uuid = FileService._get_uuid_from_user_id(user_id_string)
        
        if not user_uuid:
            return jsonify({
                'success': False,
                'error': 'User not found',
                'message': f'No user found with ID: {user_id_string}',
                'provided_id': user_id_string,
                'auth_method': auth_method,
                'note': 'Check if user exists in users table'
            }), 404
        
        print(f"✅ User UUID: {user_uuid}")
        
        # ==================== GET MODE ====================
        # Get mode parameter (default to 'recent' for backward compatibility)
        mode = request.args.get('mode', 'recent')  # 'recent' or 'library'
        print(f"📁 Mode: {mode}")
        
        if mode == 'recent':
            # ==================== RECENT MODE (DHomePage) ====================
            limit = request.args.get('limit', default=10, type=int)
            if limit > 50:  # Safety limit
                limit = 50
            
            print(f"📊 Getting recent activity for user {user_uuid}, limit: {limit}")
            
            # Get recent activity from service layer using UUID
            recent_activity = FileService.get_recent_activity(user_uuid, limit)
            
            # Get user display info
            user_info = FileService.get_user_display_info(user_uuid)
            
            # Format activity items for frontend
            formatted_files = []
            for activity in recent_activity:
                formatted_files.append({
                    'id': activity.get('file_id', activity.get('id', '')),
                    'name': activity.get('file_name', ''),
                    'sharedBy': activity.get('action_by_name', ''),
                    'status': get_activity_status_text(activity),
                    'date': activity.get('formatted_datetime', 'Jan 1, 2024 at 00:00:00'),
                    'type': activity.get('type', 'upload'),
                    'message': activity.get('message', ''),
                    'timestamp': activity.get('timestamp', ''),
                    'formatted_date': activity.get('formatted_date', ''),
                    'formatted_time': activity.get('formatted_time', ''),
                    'icon': activity.get('icon', '')
                })
            
            response_data = {
                'success': True,
                'data': formatted_files,
                'count': len(formatted_files),
                'mode': 'recent',
                'description': 'Recent file activity (uploads and shares)',
                'user_id': user_id_string,  # Return the original ID provided
                'user_uuid': user_uuid,
                'auth_method': auth_method,
                'user_info': {
                    'user_name': user_info.get('full_name', 'User'),
                    'role': user_info.get('role', 'user'),
                    'welcome_message': user_info.get('welcome_message', '')
                }
            }
            
        else:  # mode == 'library'
            # ==================== LIBRARY MODE (MyFiles) ====================
            limit = request.args.get('limit', default=20, type=int)
            page = request.args.get('page', default=1, type=int)
            search_query = request.args.get('search', '').strip()
            sort_by = request.args.get('sort_by', 'uploaded_at')
            sort_order = request.args.get('sort_order', 'desc')
            file_type = request.args.get('file_type', '')
            
            # Handle filter parameters (support both 'shared_status' and 'filter')
            shared_status = request.args.get('shared_status', 'all')
            filter_param = request.args.get('filter', '')
            
            print(f"📚 Library mode parameters:")
            print(f"  - search: {search_query}")
            print(f"  - sort_by: {sort_by}")
            print(f"  - shared_status: {shared_status}")
            print(f"  - filter: {filter_param}")
            print(f"  - file_type: {file_type}")
            
            # If filter param provided, map it to shared_status
            if filter_param and shared_status == 'all':
                if filter_param == 'shared':
                    shared_status = 'shared'
                    print(f"  ↳ Mapped filter='shared' to shared_status='shared'")
                elif filter_param == 'received':
                    shared_status = 'owned'
                    print(f"  ↳ Mapped filter='received' to shared_status='owned'")
                elif filter_param == 'all':
                    shared_status = 'all'
                    print(f"  ↳ Mapped filter='all' to shared_status='all'")
            
            # Safety limits
            if limit > 100:
                limit = 100
            if page < 1:
                page = 1
            
            # Get all files first (we'll implement proper filtering in FileService later)
            print(f"📋 Getting files with shared info for user {user_uuid}")
            all_files = FileService.get_files_with_shared_info(user_uuid, limit=100)
            print(f"📋 Retrieved {len(all_files)} files from database")
            
            # Apply simple client-side filtering for now
            filtered_files = all_files
            
            # Search filter
            if search_query:
                before_search = len(filtered_files)
                filtered_files = [f for f in filtered_files 
                                if search_query.lower() in f['name'].lower()]
                print(f"  🔍 Search filter: {before_search} → {len(filtered_files)} files")
            
            # File type filter
            if file_type:
                before_type = len(filtered_files)
                filtered_files = [f for f in filtered_files 
                                if f.get('file_extension', '') == file_type]
                print(f"  📄 File type filter: {before_type} → {len(filtered_files)} files")
            
            # Shared status filter
            if shared_status == 'shared':
                before_shared = len(filtered_files)
                filtered_files = [f for f in filtered_files 
                                if f.get('is_shared', False)]
                print(f"  🔗 Shared filter: {before_shared} → {len(filtered_files)} files")
            elif shared_status == 'owned':
                before_owned = len(filtered_files)
                filtered_files = [f for f in filtered_files 
                                if not f.get('is_shared', False)]
                print(f"  👤 Owned filter: {before_owned} → {len(filtered_files)} files")
            
            # Sort files
            if sort_by == 'name':
                filtered_files.sort(key=lambda x: x['name'].lower(), 
                                  reverse=(sort_order == 'desc'))
                print(f"  🔤 Sorted by name ({sort_order})")
            elif sort_by == 'size':
                filtered_files.sort(key=lambda x: x.get('file_size', 0), 
                                  reverse=(sort_order == 'desc'))
                print(f"  📏 Sorted by size ({sort_order})")
            else:  # uploaded_at (default)
                filtered_files.sort(key=lambda x: x.get('uploaded_at', ''), 
                                  reverse=(sort_order == 'desc'))
                print(f"  📅 Sorted by uploaded_at ({sort_order})")
            
            # Apply pagination
            total_count = len(filtered_files)
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_files = filtered_files[start_idx:end_idx]
            
            print(f"📄 Pagination: Showing {start_idx+1}-{end_idx} of {total_count} files")
            
            response_data = {
                'success': True,
                'data': paginated_files,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit if limit > 0 else 0
                },
                'filters': {
                    'search': search_query,
                    'sort_by': sort_by,
                    'sort_order': sort_order,
                    'file_type': file_type,
                    'shared_status': shared_status,
                    'filter_param': filter_param
                },
                'mode': 'library',
                'description': 'File library with filtering',
                'user_id': user_id_string,  # Return the original ID
                'user_uuid': user_uuid,
                'auth_method': auth_method
            }
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        print(f"❌ File Storage API Error: {str(e)}")
        error_traceback = traceback.format_exc()
        print(f"📝 Traceback:\n{error_traceback}")
        
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e),
            'traceback': error_traceback if os.environ.get('FLASK_DEBUG') else None
        }), 500

def get_activity_status_text(activity: Dict[str, Any]) -> str:
    """
    Generate status text for activity items
    """
    activity_type = activity.get('type', '')
    
    if activity_type == 'upload':
        return "Uploaded"
    elif activity_type == 'share':
        access_level = activity.get('access_level', 'view')
        if access_level == 'edit':
            return "Shared with edit access"
        else:
            return "Shared with view access"
    else:
        return "Updated"

@fileStorage_bp.route('/api/file-storage/test', methods=['GET', 'OPTIONS'])
def test_endpoint():
    """Test endpoint for debugging"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'X-User-ID, Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        return response, 200
    
    try:
        # Test database connection
        db_ok = FileService.test_connection()
        
        # Get request info
        user_id_header = request.headers.get('X-User-ID', 'Not provided')
        user_id_param = request.args.get('user_id', 'Not provided')
        
        response = jsonify({
            'success': True,
            'message': 'File Storage API is working',
            'database_connected': db_ok,
            'received_headers': dict(request.headers),
            'received_params': dict(request.args),
            'auth_info': {
                'x_user_id_header': user_id_header,
                'user_id_param': user_id_param,
                'recommended': 'Use X-User-ID header for new code'
            },
            'endpoint': '/api/file-storage'
        })
        
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Add a simple health check endpoint
@fileStorage_bp.route('/api/file-storage/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'File Storage API is healthy',
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    }), 200