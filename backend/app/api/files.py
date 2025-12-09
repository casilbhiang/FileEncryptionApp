# Backend API for File Management Encryption (may remove?) JY VER

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from supabase import create_client
from datetime import datetime, timedelta

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

# Test user (REMOVED)

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
    
# ===== List Files =====
@files_bp.route('/my-files', methods=['GET'])
def get_my_files():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
             return jsonify({'error': 'User ID is required'}), 400

        response = supabase.table('encrypted_files')\
            .select('*')\
            .eq('owner_id', user_id)\
            .eq('is_deleted', False)\
            .eq('upload_status', 'completed')\
            .order('uploaded_at', desc=True)\
            .execute()
        
        files = []
        for f in response.data:
            files.append({
                'id': f['id'],
                'name': f['original_filename'],
                'size': f['file_size'],
                'uploaded_at': f['uploaded_at'],
                'shared_by': 'you'
            })
        
        return jsonify({'files': files, 'total': len(files)}), 200
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Get files error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': f'{str(e)}', 'details': error_details}), 500
    
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
def encrypt_file(file_data, user_key):
    return {
        'encrypted_data': file_data,
        'iv': 'mock-iv',
        'auth_tag': 'mock-tag',
        'key_identifier': 'mock-key-id'
    }

def decrypt_file(encrypted_data, key, iv, auth_tag):
    return encrypted_data