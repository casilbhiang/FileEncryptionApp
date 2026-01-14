# Backend API for File Management Encryption (may remove?) JY VER

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import uuid
from supabase import create_client
from datetime import datetime, timedelta
import io
import base64
from app.models.storage import key_pair_store
from app.crypto.encryption import EncryptionManager
from config import Config

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
STORAGE_BUCKET = 'encrypted-files'
MAX_FILE_SIZE = 50*1024*1024
ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg'}

# Initialize Supabase
if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Blueprint for file routes
files_bp = Blueprint('files', __name__, url_prefix='/api/files')

# ===== Upload File (status: 'pending') =====
@files_bp.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id')
        user_uuid = request.form.get('user_uuid')
        encryption_metadata_str = request.form.get('encryption_metadata')

        if not user_id:
             return jsonify({'error': 'User ID is required'}), 400
             
        if not encryption_metadata_str:
             # If no metadata provided, assuming it might be a normal file or error? 
             # For this app, we expect encryption.
             return jsonify({'error': 'Encryption metadata is required'}), 400

        import json
        encryption_metadata = json.loads(encryption_metadata_str)

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension (sanity check, though encrypted files might have .enc or original ext)
        # The frontend sends original filename in 'file.name' usually, but let's check.
        # If client sends "foo.pdf" as blob name, we trust it.
        original_filename = secure_filename(file.filename)
        file_ext = os.path.splitext(original_filename)[1].lower()
        
        if file_ext not in ALLOWED_FILE_EXTENSIONS:
            return jsonify({'error': f'File type not allowed. Allowed types: {ALLOWED_FILE_EXTENSIONS}'}), 400
            
        # Check file size (Supabase limit is high, but we have a variable)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
             return jsonify({'error': 'File size exceeds the maximum limit of 50MB'}), 400

        file_data = file.read()
        
        # Create unique encrypted filename
        # We append .enc to denote it's stored encrypted
        unique_id = str(uuid.uuid4())
        encrypted_filename = f"{unique_id}{file_ext}.enc"
        storage_path = f"{user_id}/{encrypted_filename}"
        
        # Upload to Supabase Storage (It is ALREADY encrypted by client)
        print(f"Uploading to: {storage_path} for user {user_id}")
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": "application/octet-stream"}
        )
        
        # Save metadata to database with 'pending' status
        file_record = {
            'userid': user_uuid,
            'owner_id': user_id,
            'original_filename': original_filename,
            'encrypted_filename': encrypted_filename,
            'file_size': file_size,
            'mime_type': file.content_type, # This might be application/octet-stream if set by client
            'file_extension': file_ext,
            'encryption_metadata': encryption_metadata,
            'storage_bucket': STORAGE_BUCKET,
            'storage_path': storage_path,
            'upload_status': 'pending' 
        }
        
        result = supabase.table('encrypted_files').insert(file_record).execute()
        
        # Handle potential response format differences
        if hasattr(result, 'data') and len(result.data) > 0:
             file_id = result.data[0]['id']
        else:
             # Fallback or error
             print("Insert result:", result)
             return jsonify({'error': 'Failed to save file record'}), 500
        
        print(f'File uploaded successfully with PENDING status! File ID: {file_id}')
        
        return jsonify({
            'message': 'File uploaded successfully!',
            'file_id': file_id,
            'filename': original_filename
        }), 201
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Upload error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Confirm Upload (status: 'completed') =====
@files_bp.route('/confirm/<file_id>', methods=['POST'])
def confirm_upload(file_id):
    try:
        print(f"Confirming upload for file_id: {file_id}")
        
        result = supabase.table('encrypted_files')\
            .update({'upload_status': 'completed'})\
            .eq('id', file_id)\
            .eq('upload_status', 'pending')\
            .execute()
        
        if not result.data:
            return jsonify({'error': 'File not found or already confirmed'}), 404
        
        print(f'Upload confirmed: {file_id}')
        
        return jsonify({'message': 'Upload confirmed successfully'}), 200
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Confirm error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500
    
# ===== Enhanced List Files with Search, Filter, and Sort for MyFiles page (NAT) =====
@files_bp.route('/my-files', methods=['GET'])
def get_my_files():
    """Get files owned by the user AND files shared with the user"""
    try:
        user_uuid = request.args.get('user_uuid')
        if not user_uuid:
            return jsonify({'error': 'User UUID is required'}), 400
        
        # Get user's text ID from UUID
        user_text_id_query = supabase.table('users')\
            .select('user_id')\
            .eq('id', user_uuid)\
            .execute()
        
        if not user_text_id_query.data:
            return jsonify({'error': 'User not found'}), 404
        
        user_text_id = user_text_id_query.data[0]['user_id']
        
        print(f"=== GET MY FILES DEBUG ===")
        print(f"User UUID: {user_uuid}")
        print(f"User Text ID: {user_text_id}")
        
        # Get query parameters
        search_query = request.args.get('search', '').strip().lower()
        sort_by = request.args.get('sort', 'uploaded_at')
        sort_order = request.args.get('order', 'desc')
        filter_type = request.args.get('filter', 'all')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        start_idx = (page - 1) * limit
        
        # Helper: Get user name (cached)
        user_name_cache = {}
        def get_user_name(uid):
            if uid in user_name_cache:
                return user_name_cache[uid]
            try:
                result = supabase.table('users')\
                    .select('full_name, name')\
                    .eq('user_id', uid)\
                    .execute()
                if result.data:
                    user_data = result.data[0]
                    name = user_data.get('full_name') or user_data.get('name') or uid
                else:
                    name = uid
            except:
                name = uid
            user_name_cache[uid] = name
            return name
        
        # Fetch owned files
        owned_files = []
        if filter_type in ['owned', 'my_uploads', 'shared', 'all']:
            owned_query = supabase.table('encrypted_files')\
                .select('*')\
                .eq('userid', user_uuid)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')\
                .execute()
            owned_files = owned_query.data
        
        # Fetch shares for owned files (BATCH QUERY - only once!)
        file_shares_map = {}
        if owned_files:
            file_ids = [f['id'] for f in owned_files]
            shares_batch = supabase.table('file_shares')\
                .select('file_id, shared_at')\
                .in_('file_id', file_ids)\
                .eq('share_status', 'active')\
                .execute()
            
            # Build a map of file_id -> share info
            for share in shares_batch.data:
                fid = share['file_id']
                if fid not in file_shares_map:
                    file_shares_map[fid] = []
                file_shares_map[fid].append(share)
        
        # Fetch shared files (files shared WITH this user)
        shared_files = []
        if filter_type in ['received', 'all']:
            shared_query = supabase.table('file_shares')\
                .select('*, encrypted_files(*)')\
                .eq('shared_with', user_text_id)\
                .eq('share_status', 'active')\
                .execute()
            
            for share in shared_query.data:
                file_data = share.get('encrypted_files')
                if file_data and not file_data.get('is_deleted') and file_data.get('upload_status') == 'completed':
                    shared_files.append({
                        'file_data': file_data,
                        'share_data': share
                    })
        
        # Build file objects
        files = []
        
        # Add owned files
        for f in owned_files:
            shares_for_file = file_shares_map.get(f['id'], [])
            shared_count = len(shares_for_file)
            shared_at = max([s['shared_at'] for s in shares_for_file if s.get('shared_at')], default=None)
            
            file_obj = {
                'id': f['id'],
                'name': f['original_filename'],
                'size': f['file_size'],
                'uploaded_at': f['uploaded_at'],
                'file_extension': f['file_extension'],
                'is_owned': True,
                'owner_id': f['owner_id'],
                'owner_uuid': f['userid'],
                'owner_name': get_user_name(f['owner_id']),
                'last_accessed_at': f.get('last_accessed_at'),
                'is_shared': shared_count > 0,
                'shared_count': shared_count,
                'shared_by': None,
                'shared_at': shared_at
            }
            
            # Apply filter
            if filter_type == 'shared' and not file_obj['is_shared']:
                continue
            
            files.append(file_obj)
        
        # Add shared files (received)
        for item in shared_files:
            f = item['file_data']
            share = item['share_data']
            
            files.append({
                'id': f['id'],
                'name': f['original_filename'],
                'size': f['file_size'],
                'uploaded_at': f['uploaded_at'],
                'file_extension': f['file_extension'],
                'is_owned': False,
                'owner_id': f['owner_id'],
                'owner_uuid': f['userid'],
                'owner_name': get_user_name(f['owner_id']),
                'last_accessed_at': f.get('last_accessed_at'),
                'is_shared': True,
                'shared_count': 1,
                'shared_by': share['shared_by'],
                'shared_by_name': get_user_name(share['shared_by']),
                'shared_at': share.get('shared_at'),
                'share_id': share['id'],
                'access_level': share['access_level']
            })
        
        # Apply search filter
        if search_query:
            files = [f for f in files if search_query in f['name'].lower()]
        
        # Apply sorting
        if sort_by == 'name':
            files.sort(key=lambda x: (x['name'] or '').lower(), reverse=(sort_order == 'desc'))
        elif sort_by == 'size':
            files.sort(key=lambda x: (x['size'] is not None, x['size'] or 0), reverse=(sort_order == 'desc'))
        else:
            def get_sort_timestamp(file):
                timestamps = []
                if file.get('uploaded_at'):
                    timestamps.append(file['uploaded_at'])
                if file.get('shared_at'):
                    timestamps.append(file['shared_at'])
                return max(timestamps) if timestamps else ''
            files.sort(key=get_sort_timestamp, reverse=(sort_order == 'desc'))
        
        # Calculate totals before pagination
        total_files = len(files)
        
        # Apply pagination
        files = files[start_idx:start_idx + limit]
        
        print(f"Returning {len(files)} files (total: {total_files})")
        
        return jsonify({
            'files': files,
            'total': total_files,
            'page': page,
            'limit': limit,
            'total_pages': (total_files + limit - 1) // limit if limit > 0 else 0,
            'has_more': (page * limit) < total_files,
            'filters_applied': {
                'search': search_query,
                'filter': filter_type,
                'sort': sort_by,
                'order': sort_order
            }
        }), 200
    
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get files error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500
    
# Helper function to get user name
def get_user_name(user_id):
    """
    Get user's name from users table
    """
    try:
        result = supabase.table('users')\
            .select('full_name, name')\
            .eq('user_id', user_id)\
            .execute()
        
        if result.data:
            user_data = result.data[0]
            # Return full_name if exists, otherwise name, otherwise user_id
            return user_data.get('full_name') or user_data.get('name') or user_id
        
        return user_id  # Fallback to user_id if not found
    except:
        return user_id  # Fallback to user_id on error
    
# ===== Download File =====
@files_bp.route('/download/<file_id>', methods=['GET'])
def download_file(file_id):
    try:
        response = supabase.table('encrypted_files')\
            .select('*')\
            .eq('id', file_id)\
            .execute()
        
        if not response.data:
            return jsonify({'error': 'File not found'}), 404
        
        file_metadata = response.data[0]
        storage_path = file_metadata['storage_path']
        file_data = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        
        return jsonify({
            'filename': file_metadata['original_filename'],
            'data': file_data.hex(),
            'size': len(file_data)
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Download error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500
    
# ===== Delete File =====
@files_bp.route('/delete/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        print(f"DELETE request received for file_id: {file_id}")
        user_id = request.args.get('user_uuid')
        
        if not user_id:
             return jsonify({'error': 'User ID is required'}), 400
        
        result = supabase.table('encrypted_files')\
            .update({'is_deleted': True})\
            .eq('id', file_id)\
            .eq('userid', user_id)\
            .execute()
        
        if result.data:
            print(f"File {file_id} deleted successfully")
        
        return jsonify({'message': 'File deleted successfully'}), 200
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Delete error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500
    
# ===== Cleanup Pending Uploads (only cancelled uploads) =====
@files_bp.route('/cleanup-pending', methods=['POST'])
def cleanup_pending_uploads():
    """
    Only deletes files that were uploaded but NEVER confirmed (cancelled uploads).
    Does NOT affect completed files.
    """
    try:
        # Only delete pending uploads older than 3 minutes
        cutoff_time = (datetime.now() - timedelta(minutes=3)).isoformat()
        
        print(f"Cleaning up PENDING uploads older than: {cutoff_time}")
        
        response = supabase.table('encrypted_files')\
            .select('*')\
            .eq('upload_status', 'pending')\
            .lt('uploaded_at', cutoff_time)\
            .execute()
        
        pending_files = response.data
        deleted_count = 0
        
        for file_record in pending_files:
            file_id = file_record['id']
            storage_path = file_record['storage_path']
            
            try:
                print(f"Deleting from storage: {storage_path}")
                supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
                
                supabase.table('encrypted_files')\
                    .delete()\
                    .eq('id', file_id)\
                    .execute()
                
                deleted_count += 1
                print(f"Cleaned up cancelled upload: {file_id}")
                
            except Exception as delete_error:
                print(f"Error cleaning up file {file_id}: {delete_error}")
                continue
        
        print(f"Cleanup complete. Deleted {deleted_count} cancelled uploads.")
        
        return jsonify({
            'message': f'Cleaned up {deleted_count} cancelled uploads',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Cleanup error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500

# ===== Get File Metadata (for decryption) =====
@files_bp.route('/metadata/<file_id>', methods=['GET'])
def get_file_metadata(file_id):
    """
    Get file metadata including encryption_metadata (IV, authTag, etc.)
    Required for client-side decryption
    """
    try:
        user_uuid = request.args.get('user_uuid')
        if not user_uuid:
            return jsonify({'error': 'User UUID is required'}), 400
        
        print(f"Fetching metadata for file_id: {file_id}, user: {user_uuid}")
        
        # Check if user owns the file OR has access via sharing
        # First check ownership
        response = supabase.table('encrypted_files')\
            .select('id, original_filename, encryption_metadata, userid')\
            .eq('id', file_id)\
            .eq('is_deleted', False)\
            .eq('upload_status', 'completed')\
            .execute()
        
        if not response.data:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = response.data[0]
        
        # Verify user has access (either owner or shared with them)
        if file_data['userid'] != user_uuid:
            # Check if file is shared with this user
            # Get user's text ID
            user_query = supabase.table('users')\
                .select('user_id')\
                .eq('id', user_uuid)\
                .execute()
            
            if not user_query.data:
                return jsonify({'error': 'User not found'}), 404
            
            user_text_id = user_query.data[0]['user_id']
            
            # Check file_shares
            share_query = supabase.table('file_shares')\
                .select('id')\
                .eq('file_id', file_id)\
                .eq('shared_with', user_text_id)\
                .eq('share_status', 'active')\
                .execute()
            
            if not share_query.data:
                return jsonify({'error': 'Access denied'}), 403
        
        print(f"Metadata retrieved successfully for file: {file_id}")
        
        return jsonify({
            'original_filename': file_data['original_filename'],
            'encryption_metadata': file_data['encryption_metadata']
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Metadata error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': str(e), 'details': error_details}), 500

# ===== Get All File Shares (Admin) =====
@files_bp.route('/shares/all', methods=['GET'])
def get_all_file_shares():
    """Get all file shares for admin file logs page with file and user details"""
    try:
        # Fetch all file shares with file details
        shares_response = supabase.table('file_shares')\
            .select('*, encrypted_files(original_filename, owner_id)')\
            .eq('share_status', 'active')\
            .order('shared_at', desc=True)\
            .execute()

        if not shares_response.data:
            return jsonify({'success': True, 'shares': []}), 200

        # Build enriched shares list with file names and user details
        enriched_shares = []

        # Cache for user names to avoid repeated queries
        user_cache = {}

        def get_user_name(user_id):
            if user_id in user_cache:
                return user_cache[user_id]
            try:
                user_response = supabase.table('users')\
                    .select('full_name')\
                    .eq('user_id', user_id)\
                    .execute()
                if user_response.data:
                    name = user_response.data[0]['full_name']
                    user_cache[user_id] = name
                    return name
            except:
                pass
            return 'Unknown'

        for share in shares_response.data:
            file_info = share.get('encrypted_files', {})

            enriched_share = {
                'id': share['id'],
                'file_id': share['file_id'],
                'file_name': file_info.get('original_filename', 'Unknown'),
                'owner_id': file_info.get('owner_id', 'Unknown'),
                'owner_name': get_user_name(file_info.get('owner_id', '')),
                'shared_by': share['shared_by'],
                'shared_by_name': get_user_name(share['shared_by']),
                'shared_with': share['shared_with'],
                'shared_with_name': get_user_name(share['shared_with']),
                'access_level': share['access_level'],
                'share_status': share['share_status'],
                'shared_at': share['shared_at'],
                'last_accessed_at': share.get('last_accessed_at'),
                'revoked_at': share.get('revoked_at')
            }

            enriched_shares.append(enriched_share)

        return jsonify({
            'success': True,
            'shares': enriched_shares
        }), 200

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get all file shares error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': str(e), 'details': error_details}), 500