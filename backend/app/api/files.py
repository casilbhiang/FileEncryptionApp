"""
API endpoints for file encryption and decryption
"""
from flask import Blueprint, request, jsonify, send_file
from app.crypto.encryption import EncryptionManager
from app.models.encryption_models import EncryptedFile
from app.models.storage import key_pair_store, encrypted_file_store
import io
import uuid

files_bp = Blueprint('files', __name__)


@files_bp.route('/encrypt', methods=['POST'])
def encrypt_file():
    """Encrypt a file before upload"""
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
    """Decrypt a file and download it"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Get file record
        encrypted_file = encrypted_file_store.get(file_id)
        if not encrypted_file:
            return jsonify({'error': 'File not found'}), 404
        
        # Get key pair
        key_pair = key_pair_store.get(encrypted_file.key_pair_id)
        if not key_pair:
            return jsonify({'error': 'Encryption key not found'}), 404
        
        # Verify authorization
        if user_id != key_pair.doctor_id and user_id != key_pair.patient_id:
            return jsonify({'error': 'Unauthorized to decrypt this file'}), 403
        
        try:
            # Get encryption key
            key = EncryptionManager.base64_to_key(key_pair.encryption_key)
            
            # Decrypt file
            decrypted_data = EncryptionManager.decrypt_file(
                encrypted_file.ciphertext,
                encrypted_file.nonce,
                key
            )
            
            # Return file
            return send_file(
                io.BytesIO(decrypted_data),
                mimetype=encrypted_file.mime_type,
                as_attachment=True,
                download_name=encrypted_file.filename
            )
            
        except Exception as e:
            # User Story #17 & #14: Notify if decryption fails
            return jsonify({
                'error': 'Decryption failed',
                'message': 'The file could not be decrypted. The encryption key may be incorrect or the file may be corrupted.',
                'details': str(e)
            }), 422
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/list', methods=['GET'])
def list_files():
    """List encrypted files"""
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
def delete_file(file_id):
    """Delete an encrypted file"""
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
