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
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Get query parameters
        search_query = request.args.get('search', '').strip().lower()
        sort_by = request.args.get('sort', 'uploaded_at')
        sort_order = request.args.get('order', 'desc')
        filter_type = request.args.get('filter', 'all')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        start_idx = (page - 1) * limit
        
        # Helper: Get user name (cached to avoid repeated queries)
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
        
        # Helper: Build file object with share info
        def build_file_obj(f, is_owned=True, share_data=None):
            file_obj = {
                'id': f['id'],
                'name': f['original_filename'],
                'size': f['file_size'],
                'uploaded_at': f['uploaded_at'],
                'file_extension': f['file_extension'],
                'is_owned': is_owned,
                'owner_id': f['owner_id'],
                'owner_name': get_user_name(f['owner_id']),
                'last_accessed_at': f.get('last_accessed_at')
            }
            
            if is_owned:
                # For owned files, check if shared with others
                shares_check = supabase.table('file_shares')\
                    .select('id, shared_at', count='exact')\
                    .eq('file_id', f['id'])\
                    .eq('share_status', 'active')\
                    .execute()
                
                shared_count = shares_check.count if hasattr(shares_check, 'count') else 0
                shared_at = max([s['shared_at'] for s in shares_check.data if s.get('shared_at')], default=None)
                
                file_obj.update({
                    'is_shared': shared_count > 0,
                    'shared_count': shared_count,
                    'shared_by': None,
                    'shared_at': shared_at
                })
            else:
                # For received files
                file_obj.update({
                    'is_shared': True,
                    'shared_count': 1,
                    'shared_by': share_data['shared_by'],
                    'shared_by_name': get_user_name(share_data['shared_by']),
                    'shared_at': share_data.get('shared_at'),
                    'share_id': share_data['id'],
                    'access_level': share_data['access_level']
                })
            
            return file_obj
        
        # Fetch data based on filter
        files = []
        
        if filter_type in ['owned', 'my_uploads', 'shared']:
            # Get owned files
            owned_query = supabase.table('encrypted_files')\
                .select('*')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')
            
            owned_result = owned_query.execute()
            
            for f in owned_result.data:
                file_obj = build_file_obj(f, is_owned=True)
                
                # Apply filter logic
                if filter_type == 'shared' and not file_obj['is_shared']:
                    continue
                
                files.append(file_obj)
        
        if filter_type in ['received', 'all']:
            # Get shared files
            shared_query = supabase.table('file_shares')\
                .select('*, encrypted_files(*)')\
                .eq('shared_with', user_id)\
                .eq('share_status', 'active')
            
            shared_result = shared_query.execute()
            
            for share in shared_result.data:
                file_data = share.get('encrypted_files')
                if file_data and not file_data.get('is_deleted') and file_data.get('upload_status') == 'completed':
                    files.append(build_file_obj(file_data, is_owned=False, share_data=share))
        
        if filter_type == 'all':
            # Get owned files as well
            owned_query = supabase.table('encrypted_files')\
                .select('*')\
                .eq('owner_id', user_id)\
                .eq('is_deleted', False)\
                .eq('upload_status', 'completed')
            
            owned_result = owned_query.execute()
            files.extend([build_file_obj(f, is_owned=True) for f in owned_result.data])
        
        # Apply search filter
        if search_query:
            files = [f for f in files if search_query in f['name'].lower()]
        
        # Apply sorting with proper handling of None/null values
        print(f"DEBUG: Sorting by '{sort_by}' in '{sort_order}' order")
        print(f"DEBUG: Total files before sort: {len(files)}")
        
        if sort_by == 'name':
            files.sort(key=lambda x: (x['name'] or '').lower(), reverse=(sort_order == 'desc'))
        elif sort_by == 'size':
            # Put None/null sizes at the end regardless of sort order
            files.sort(key=lambda x: (x['size'] is not None, x['size'] or 0), reverse=(sort_order == 'desc'))
        else:  # 'uploaded_at' or default
            # Sort by most recent activity (upload or share, whichever is newer)
            def get_sort_timestamp(file):
                timestamps = []
                
                # Always include uploaded_at
                if file.get('uploaded_at'):
                    timestamps.append(file['uploaded_at'])
                
                # Include shared_at if it exists
                if file.get('shared_at'):
                    timestamps.append(file['shared_at'])
                
                # Return the most recent timestamp, or empty string if none
                return max(timestamps) if timestamps else ''
            
            files.sort(key=get_sort_timestamp, reverse=(sort_order == 'desc'))
            
            # Debug: Show what timestamps are being used
            if files:
                print(f"DEBUG: First 3 files after sort:")
                for i, f in enumerate(files[:3]):
                    sort_ts = get_sort_timestamp(f)
                    print(f"  {i+1}. {f['name']}")
                    print(f"     - uploaded_at: {f.get('uploaded_at')}")
                    print(f"     - shared_at: {f.get('shared_at')}")
                    print(f"     - sort_timestamp (most recent): {sort_ts}")
        
        # Calculate totals before pagination
        total_files = len(files)
        
        # Apply pagination
        files = files[start_idx:start_idx + limit]
        
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
        user_id = request.args.get('user_id')
        
        if not user_id:
             return jsonify({'error': 'User ID is required'}), 400
        
        result = supabase.table('encrypted_files')\
            .update({'is_deleted': True})\
            .eq('id', file_id)\
            .eq('owner_id', user_id)\
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
    
# ========== Encryption & Decryption ========== 
# PLACEHOLDER FOR NOW
# ===== Decrypt File (Server-Side) =====
@files_bp.route('/decrypt/<file_id>', methods=['GET'])
def decrypt_file_route(file_id):
    """
    Decrypts a file on the server and returns the plaintext content.
    User Story: DR#17 & PT#14
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
             return jsonify({'error': 'User ID is required'}), 400

        # 1. Fetch File Metadata
        response = supabase.table('encrypted_files').select('*').eq('id', file_id).execute()
        if not response.data:
            return jsonify({'error': 'Failed to download encrypted file from storage'}), 500
        file_record = response.data[0]

        # 2. Get Encryption Keys (Candidates)
        # Find active and inactive keys for this user to ensure we can decrypt older files
        all_keys = key_pair_store.list_by_user(user_id)
        candidates = all_keys
        
        if not candidates:
             return jsonify({'error': 'No encryption keys found for user'}), 422

        # 4. Download Encrypted Content
        storage_path = file_record['storage_path']
        try:
            enc_file_bytes = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        except Exception as e:
            return jsonify({'error': 'Failed to download encrypted file from storage'}), 500
        meta = file_record.get('encryption_metadata') or {}
        iv_b64 = meta.get('iv')
        auth_tag_b64 = meta.get('authTag') 
        
        if not iv_b64 or not auth_tag_b64:
             return jsonify({'error': 'Missing encryption metadata (IV or AuthTag)'}), 422

        try:
            # The file from WebCrypto ALREADY includes the Auth Tag at the end.
            # Python's AESGCM.decrypt also expects (Ciphertext + Tag).
            # So we do NOT need to append the tag again.
            full_ciphertext_b64 = base64.b64encode(enc_file_bytes).decode('utf-8')
        except Exception as e:
             return jsonify({'error': 'Failed to process encryption metadata'}), 422

        # Try to decrypt with ALL candidate keys
        last_error = None
        print(f"Attempting to decrypt file {file_id} (Uploaded: {file_record.get('uploaded_at')})")
        print(f"Found {len(candidates)} candidate keys for user {user_id}")
        
        for key_pair in candidates:
            try:
                print(f"Trying KeyID: {key_pair.key_id} (Created: {key_pair.created_at})")
                
                # 3. Decrypt the DEK (using Master Key)
                try:
                    dek_b64 = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
                    dek_bytes = EncryptionManager.base64_to_key(dek_b64)
                except Exception as e:
                    print(f"Skipping key {key_pair.key_id}: DEK unlock failed ({e})")
                    continue

                # 4. Download Encrypted Content (only need to do this once, but stream is consumed?)
                # We should download once outside loop or re-download?
                # Actually, supabase.storage.download returns bytes, so we can reuse `enc_file_bytes`
                # Let's move download OUTSIDE the loop.
                pass 

                # 6. Decrypt
                decrypted_bytes = EncryptionManager.decrypt_file(full_ciphertext_b64, iv_b64, dek_bytes)
                
                # 7. Return File (Success!)
                return send_file(
                    io.BytesIO(decrypted_bytes),
                    mimetype=file_record.get('mime_type', 'application/octet-stream'),
                    as_attachment=True,
                    download_name=file_record['original_filename']
                )
                
            except Exception as e:
                # This key failed, try next
                print(f"Key {key_pair.key_id} failed to decrypt file: {e}")
                last_error = str(e)
                continue
        
        # If we get here, no key worked
        print(f"All keys failed for user {user_id}. Last error: {last_error}")
        return jsonify({
            'error': 'Decryption failed', 
            'message': 'Could not decrypt file with any of your active keys.',
            'details': last_error
        }), 422

    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'details': traceback.format_exc()}), 500