"""
File Storage API Routes
Unified endpoint for file storage operations
Handles both DHomePage (recent activity) and MyFiles (full library with filters)
"""

from flask import Blueprint, jsonify, request
import re
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
    
    Parameters:
      mode (str): 'recent' or 'library' (default: 'recent' for backward compatibility)
      limit (int): Number of results (default: 10)
      page (int): Page number (default: 1, for library mode only)
      search (str): Search in filename (library mode only)
      sort_by (str): 'uploaded_at', 'name', or 'size' (library mode only)
      sort_order (str): 'asc' or 'desc' (library mode only)
      file_type (str): Filter by extension like '.pdf' (library mode only)
      shared_status (str): 'all', 'shared', 'owned' (library mode only)
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'X-User-ID, Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        return response, 200
    
    try:
        # Get user ID from frontend
        user_id_string = request.headers.get('X-User-ID')
        
        if not user_id_string:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'message': 'Missing X-User-ID header'
            }), 401
        
        # Convert user_id (e.g., 'DOC001') to UUID
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
        
        if uuid_pattern.match(user_id_string):
            user_uuid = user_id_string
        else:
            user_uuid = FileService._get_uuid_from_user_id(user_id_string)
        
        if not user_uuid:
            return jsonify({
                'success': False,
                'error': 'User not found',
                'message': f'No user found with ID: {user_id_string}'
            }), 404
        
        # Get mode parameter (default to 'recent' for backward compatibility)
        mode = request.args.get('mode', 'recent')  # 'recent' or 'library'
        
        if mode == 'recent':
            # DHomePage mode: simple, recent files
            limit = request.args.get('limit', default=10, type=int)
            if limit > 50:  # Safety limit
                limit = 50
            
            # Get data from service layer using UUID
            files = FileService.get_recent_uploads_for_user(user_uuid, limit)
            
            response_data = {
                'success': True,
                'data': files,
                'count': len(files),
                'mode': 'recent',
                'description': 'Recent file activity',
                'user_id': user_id_string,
                'user_uuid': user_uuid  # For debugging
            }
            
        else:  # mode == 'library'
            # MyFiles mode: full library with filters
            limit = request.args.get('limit', default=20, type=int)
            page = request.args.get('page', default=1, type=int)
            search_query = request.args.get('search', '').strip()
            sort_by = request.args.get('sort_by', 'uploaded_at')
            sort_order = request.args.get('sort_order', 'desc')
            file_type = request.args.get('file_type', '')
            shared_status = request.args.get('shared_status', 'all')
            
            # Safety limits
            if limit > 100:
                limit = 100
            if page < 1:
                page = 1
            
            # Get all files first (we'll implement proper filtering in FileService later)
            # For now, get a larger set and filter client-side
            all_files = FileService.get_files_with_shared_info(user_uuid, limit=100)
            
            # Apply simple client-side filtering for now
            filtered_files = all_files
            
            # Search filter
            if search_query:
                filtered_files = [f for f in filtered_files 
                                if search_query.lower() in f['name'].lower()]
            
            # File type filter
            if file_type:
                filtered_files = [f for f in filtered_files 
                                if f.get('file_extension', '') == file_type]
            
            # Shared status filter
            if shared_status == 'shared':
                filtered_files = [f for f in filtered_files 
                                if f.get('is_shared', False)]
            elif shared_status == 'owned':
                filtered_files = [f for f in filtered_files 
                                if not f.get('is_shared', False)]
            # Note: 'received' would need special handling
            
            # Sort files
            if sort_by == 'name':
                filtered_files.sort(key=lambda x: x['name'].lower(), 
                                  reverse=(sort_order == 'desc'))
            elif sort_by == 'size':
                filtered_files.sort(key=lambda x: x.get('file_size', 0), 
                                  reverse=(sort_order == 'desc'))
            else:  # uploaded_at (default)
                filtered_files.sort(key=lambda x: x.get('uploaded_at', ''), 
                                  reverse=(sort_order == 'desc'))
            
            # Apply pagination
            total_count = len(filtered_files)
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_files = filtered_files[start_idx:end_idx]
            
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
                    'shared_status': shared_status
                },
                'mode': 'library',
                'description': 'File library with filtering',
                'user_id': user_id_string,
                'user_uuid': user_uuid
            }
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        print(f"❌ File Storage API Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

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
        user_id = request.headers.get('X-User-ID', 'Not provided')
        
        response = jsonify({
            'success': True,
            'message': 'File Storage API is working',
            'database_connected': db_ok,
            'received_user_id': user_id,
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
        'status': 'ok'
    }), 200