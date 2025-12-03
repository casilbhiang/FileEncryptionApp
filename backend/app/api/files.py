"""
API endpoints for file encryption and decryption (User's AES-GCM)
AND File Upload to Supabase (Friend's logic)
"""
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import uuid
import io
from datetime import datetime, timedelta
from supabase import create_client
import base64

# User's imports
from app.crypto.encryption import EncryptionManager
from app.models.encryption_models import EncryptedFile
from app.models.storage import key_pair_store, encrypted_file_store

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') # Using Service Role Key for backend
# Fallback to anon key if service role not found, but service role is better for backend
if not SUPABASE_SERVICE_ROLE_KEY:
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

STORAGE_BUCKET = 'encrypted-files'
MAX_FILE_SIZE = 50*1024*1024
ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.docx'}

# Initialize Supabase
supabase = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Blueprint
# Using HEAD's definition (no prefix) so __init__.py controls it.
files_bp = Blueprint('files', __name__)

# Test user (from Friend's code)
test_user = {
    'id': '790f3fdd-7d0a-4ab8-b6a3-d413d3b04853', 
    'user_id': 'DR001',
    'full_name': 'Test Name'
}

# ==========================================
# USER'S AES-GCM ENDPOINTS
# ==========================================

@files_bp.route('/encrypt', methods=['POST'])
def encrypt_file():
    """Encrypt a file before upload (Local/In-Memory Store)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        key_pair_id = request.form.get('key_pair_id')
        owner_id = request.form.get('owner_id')
        
        if not file or file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not key_pair_id or not owner_id:
            return jsonify({'error': 'key_pair_id and owner_id are required'}), 400
        
        # Get key pair
        key_pair = key_pair_store.get(key_pair_id)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
        
        if key_pair.status != 'Active':
            return jsonify({'error': 'Key pair is not active'}), 403
        
        # Read file data
        file_data = file.read()
        file_size = len(file_data)
        
        # Get encryption key
        key = EncryptionManager.base64_to_key(key_pair.encryption_key)
        
        # Encrypt file
        ciphertext_b64, nonce_b64 = EncryptionManager.encrypt_file(file_data, key)
        
        # Generate file ID
        file_id = f"f-{uuid.uuid4().hex[:16]}"
        
        # Create encrypted file record
        encrypted_file = EncryptedFile(
            file_id=file_id,
            filename=file.filename,
            owner_id=owner_id,
            key_pair_id=key_pair_id,
            ciphertext=ciphertext_b64,
            nonce=nonce_b64,
            file_size=file_size,
            mime_type=file.content_type or 'application/octet-stream'
        )
        
        # Store file record
        encrypted_file_store.create(encrypted_file)
        
        return jsonify({
            'success': True,
            'file_id': file_id,
            'filename': encrypted_file.filename,
            'ciphertext': ciphertext_b64,
            'nonce': nonce_b64,
            'file_size': file_size
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/decrypt/<file_id>', methods=['GET'])
def decrypt_file(file_id):
    """Decrypt a file and download it (from Supabase)"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Get file record from Supabase
        try:
            response = supabase.table('encrypted_files').select('*').eq('id', file_id).execute()
            if not response.data:
                return jsonify({'error': 'File not found'}), 404
            encrypted_file = response.data[0]
        except Exception as e:
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        
        # Get metadata
        metadata = encrypted_file.get('encryption_metadata', {})
        key_pair_id = metadata.get('key_pair_id')
        
        if not key_pair_id:
            # Fallback for old files or placeholder data
            return jsonify({'error': 'File is not properly encrypted (missing key ID)'}), 422
        
        # Get key pair from persistent store
        key_pair = key_pair_store.get(key_pair_id)
        if not key_pair:
            return jsonify({'error': 'Encryption key not found'}), 404
        
        # Verify authorization (Doctor or Patient)
        if user_id != key_pair.doctor_id and user_id != key_pair.patient_id:
             # Also allow owner to decrypt (e.g. for verification)
            if user_id != encrypted_file.get('owner_id'):
                return jsonify({'error': 'Unauthorized to decrypt this file'}), 403
        
        try:
            # Download encrypted file from Supabase Storage
            storage_path = encrypted_file['storage_path']
            print(f"Downloading from: {storage_path}")
            file_data = supabase.storage.from_(encrypted_file['storage_bucket']).download(storage_path)
            
            # Get encryption key
            key = EncryptionManager.base64_to_key(key_pair.encryption_key)
            
            # Decrypt file
            # Note: EncryptionManager.decrypt_file expects base64 strings
            # We need to convert our downloaded bytes to base64 string for the manager
            ciphertext_b64 = base64.b64encode(file_data).decode('utf-8')
            nonce_b64 = metadata.get('iv') # We stored nonce as 'iv' in upload
            
            decrypted_data = EncryptionManager.decrypt_file(
                ciphertext_b64,
                nonce_b64,
                key
            )
            
            # Return file
            return send_file(
                io.BytesIO(decrypted_data),
                mimetype=encrypted_file['mime_type'],
                as_attachment=True,
                download_name=encrypted_file['original_filename']
            )
            
        except Exception as e:
            print(f"Decryption error: {e}")
            # User Story #17 & #14: Notify if decryption fails
            return jsonify({
                'error': 'Decryption failed',
                'message': 'The file could not be decrypted. The encryption key may be incorrect or the file may be corrupted.',
                'details': str(e)
            }), 422
            
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': str(e)}), 500



@files_bp.route('/list', methods=['GET'])
def list_files():
    """List encrypted files (Local/In-Memory Store)"""
    try:
        owner_id = request.args.get('owner_id')
        key_pair_id = request.args.get('key_pair_id')
        
        if owner_id:
            files = encrypted_file_store.list_by_owner(owner_id)
        elif key_pair_id:
            files = encrypted_file_store.list_by_key_pair(key_pair_id)
        else:
            return jsonify({'error': 'owner_id or key_pair_id is required'}), 400
        
        return jsonify({
            'success': True,
            'files': [f.to_dict() for f in files],
            'count': len(files)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/<file_id>', methods=['DELETE'])
def delete_local_record(file_id):
    """Delete an encrypted file record (Local/In-Memory Store)"""
    try:
        success = encrypted_file_store.delete(file_id)
        if not success:
            return jsonify({'error': 'File not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================
# FRIEND'S SUPABASE UPLOAD ENDPOINTS
# ==========================================

# ===== Upload File (status: 'pending') =====
@files_bp.route('/upload', methods=['POST'])
def upload_file():
    try:
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_FILE_EXTENSIONS:
            return jsonify({'error': f'File type not allowed. Allowed types: {ALLOWED_FILE_EXTENSIONS}'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds the maximum limit of 50MB'}), 400
        
        # Read file
        file_data = file.read()
        original_filename = secure_filename(file.filename)
        
        # --- ENCRYPTION LOGIC ---
        # Find a key pair for this user
        # Allow user_id to be passed in form data, fallback to test_user
        user_id = request.form.get('user_id') or test_user['user_id']
        
        print(f"Uploading for user: {user_id}")
        
        key_pairs = key_pair_store.list_by_user(user_id)
        active_key_pair = next((kp for kp in key_pairs if kp.status == 'Active'), None)
        
        if not active_key_pair:
            return jsonify({'error': f'No active encryption key found for user {user_id}. Please generate a key pair first.'}), 400

        # Encrypt
        key = EncryptionManager.base64_to_key(active_key_pair.encryption_key)
        # encrypt_file returns (ciphertext_b64, nonce_b64)
        ciphertext_b64, nonce_b64 = EncryptionManager.encrypt_file(file_data, key)
        
        # Convert base64 ciphertext back to bytes for storage efficiency
        encrypted_bytes = base64.b64decode(ciphertext_b64)
        
        # Create unique encrypted filename
        encrypted_filename = f"{uuid.uuid4()}{file_ext}.enc"
        storage_path = f"{test_user['id']}/{encrypted_filename}"
        
        # Upload to Supabase Storage
        print(f"Uploading to: {storage_path}")
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=encrypted_bytes,
            file_options={"content-type": "application/octet-stream"}
        )
        
        # Save metadata to database with 'pending' status
        file_record = {
            'owner_id': test_user['id'],
            'original_filename': original_filename,
            'encrypted_filename': encrypted_filename,
            'file_size': len(encrypted_bytes),
            'mime_type': file.content_type,
            'file_extension': file_ext,
            'encryption_metadata': {
                'iv': nonce_b64, # Storing nonce as 'iv'
                'auth_tag': 'embedded', # Auth tag is embedded in GCM ciphertext
                'algorithm': 'AES-GCM-256',
                'key_pair_id': active_key_pair.key_id
            },
            'storage_bucket': STORAGE_BUCKET,
            'storage_path': storage_path,
            'upload_status': 'pending' 
        }
        
        result = supabase.table('encrypted_files').insert(file_record).execute()
        file_id = result.data[0]['id']
        
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
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

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
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

        response = supabase.table('encrypted_files')\
            .select('*')\
            .eq('owner_id', test_user['id'])\
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
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

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
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

        print(f"DELETE request received for file_id: {file_id}")
        
        result = supabase.table('encrypted_files')\
            .update({'is_deleted': True})\
            .eq('id', file_id)\
            .eq('owner_id', test_user['id'])\
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
        if not supabase:
             return jsonify({'error': 'Supabase not configured'}), 500

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
