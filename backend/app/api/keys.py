"""
API endpoints for encryption key management
"""
from flask import Blueprint, request, jsonify
from app.crypto.encryption import EncryptionManager
from app.crypto.qr_generator import QRCodeGenerator
from app.models.encryption_models import KeyPair
from app.models.storage import key_pair_store
from app.utils.audit_logger import log_audit
from datetime import datetime, timedelta
import json

keys_bp = Blueprint('keys', __name__)

@keys_bp.route('/generate', methods=['POST'])
def generate_key_pair():
    try:
        data = request.get_json()
        doctor_id = data.get('doctor_id')
        patient_id = data.get('patient_id')
        
        if not doctor_id or not patient_id:
            return jsonify({'error': 'doctor_id and patient_id are required'}), 400
            
        if doctor_id == patient_id:
            return jsonify({'error': 'Doctor and Patient cannot be the same user'}), 400
            
        # Verify doctor and patient exist in users table
        from app.utils.supabase_client import get_supabase_admin_client
        supabase = get_supabase_admin_client()
        
        # Check doctor
        doc_res = supabase.table('users').select('user_id', 'role').eq('user_id', doctor_id).execute()
        if not doc_res.data or len(doc_res.data) == 0:
             return jsonify({'error': f'Doctor with ID {doctor_id} not found'}), 404
        if doc_res.data[0].get('role') != 'doctor':
             return jsonify({'error': f'User {doctor_id} is not a doctor'}), 400
             
        # Check patient
        pat_res = supabase.table('users').select('user_id', 'role').eq('user_id', patient_id).execute()
        if not pat_res.data or len(pat_res.data) == 0:
             return jsonify({'error': f'Patient with ID {patient_id} not found'}), 404
        if pat_res.data[0].get('role') != 'patient':
             return jsonify({'error': f'User {patient_id} is not a patient'}), 400
        
        # Check if key pair already exists
        existing = key_pair_store.get_by_users(doctor_id, patient_id)
        if existing and existing.status == 'Active':
            return jsonify({'error': 'Active key pair already exists for these users'}), 409
        
        # Generate new encryption key (DEK)
        encryption_key = EncryptionManager.generate_key()
        key_b64 = EncryptionManager.key_to_base64(encryption_key)
        # Encrypt the DEK for storage using Master Key
        from config import Config
        encrypted_key_b64 = EncryptionManager.encrypt_dek(key_b64, Config.MASTER_KEY)
        
        # Generate key pair ID
        key_id = EncryptionManager.generate_key_pair_id()
        
        # Create key pair (Store ENCRYPTED key)
        key_pair = KeyPair(
            key_id=key_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            encryption_key=encrypted_key_b64,  # Storing encrypted blob
            status='Pending',
            expires_at=datetime.utcnow() + timedelta(days=60) # Key expires in 2 months
        )
        
        # Store key pair
        key_pair_store.create(key_pair)
        
        # Log audit event
        log_audit(
            user_id=None,  # System action
            action='key_generate',
            resource_type='key',
            resource_id=key_id,
            details=f"Generated key pair {key_id} for {doctor_id} → {patient_id}",
            result='success'
        )
        
        # Generate QR code with PLAINTEXT key data (decrypted)
        qr_data = {
            'key_id': key_id,
            'key': key_b64,  # QR code gets the usable key
            'doctor_id': doctor_id,
            'patient_id': patient_id
        }
        qr_code = QRCodeGenerator.generate_connection_qr(qr_data, size=300)
        
        return jsonify({
            'success': True,
            'key_pair': key_pair.to_dict(),  # Returns encrypted key in dict
            'qr_code': f'data:image/png;base64,{qr_code}'
        }), 201
        
    except Exception as e:
        # Log failed attempt
        log_audit(
            user_id=None,
            action='key_generate',
            resource_type='key',
            details=f"Failed to generate key for {data.get('doctor_id', 'unknown')} → {data.get('patient_id', 'unknown')}: {str(e)}",
            result='failure',
            error_message=str(e)
        )
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/list', methods=['GET'])
def list_key_pairs():
    """List all key pairs"""
    try:
        user_id = request.args.get('user_id')
        status_filter = request.args.get('status')
        
        if user_id:
            key_pairs = key_pair_store.list_by_user(user_id)
        else:
            key_pairs = key_pair_store.list_all()
        
        # Apply status filter
        if status_filter:
            key_pairs = [kp for kp in key_pairs if kp.status == status_filter]
        
        return jsonify({
            'success': True,
            'key_pairs': [kp.to_dict() for kp in key_pairs],
            'count': len(key_pairs)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/<key_id>', methods=['GET'])
def get_key_pair(key_id):
    """Get a specific key pair by ID"""
    try:
        include_key = request.args.get('include_key', 'false').lower() == 'true'
        
        key_pair = key_pair_store.get(key_id)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
        
        # Authorization Check (If user_id is provided)
        user_id = request.args.get('user_id')
        if include_key and user_id:
            # Ensure the requesting user is part of this key pair
            if user_id != key_pair.doctor_id and user_id != key_pair.patient_id:
                 return jsonify({'error': 'Unauthorized access to key material'}), 403
        
        if include_key:
            # If requesting the raw key, we must decrypt it first
            try:
                from config import Config
                decrypted_key = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
                
                # Create a temporary copy to return decrypted data
                kp_dict = key_pair.to_dict_with_key()
                kp_dict['encryption_key'] = decrypted_key
                
                return jsonify({
                    'success': True,
                    'key_pair': kp_dict
                }), 200
            except Exception as dec_err:
                return jsonify({'error': f'Failed to decrypt key: {str(dec_err)}'}), 500
        else:
            return jsonify({
                'success': True,
                'key_pair': key_pair.to_dict()
            }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@keys_bp.route('/<key_id>/retrieve', methods=['POST'])
def retrieve_key(key_id):
    """
    Retrieve a key pair with decrypted key (for auto-restoration)
    Requires user_id in body for authorization
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
            
        key_pair = key_pair_store.get(key_id)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
            
        # strict output: active check
        if key_pair.status != 'Active':
             return jsonify({'error': 'Key pair is not active'}), 403

        # Authorization Check
        if user_id != key_pair.doctor_id and user_id != key_pair.patient_id:
             return jsonify({'error': 'Unauthorized access to key material'}), 403
             
        # Check Expiration
        if key_pair.expires_at:
             expires_at_naive = key_pair.expires_at.replace(tzinfo=None)
             if expires_at_naive < datetime.utcnow():
                 return jsonify({'error': 'Key pair has expired'}), 403
        
        # Decrypt key
        try:
            from config import Config
            decrypted_key = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
            
            # Create a temporary copy to return decrypted data
            kp_dict = key_pair.to_dict_with_key()
            kp_dict['encryption_key'] = decrypted_key
            
            return jsonify({
                'success': True,
                'key_pair': kp_dict
            }), 200
        except Exception as dec_err:
            return jsonify({'error': f'Failed to decrypt key: {str(dec_err)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@keys_bp.route('/<key_id>/status', methods=['PATCH'])
def update_key_status(key_id):
    """Update key pair status"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['Active', 'Inactive', 'Revoked']:
            return jsonify({'error': 'Invalid status'}), 400
        
        key_pair = key_pair_store.update_status(key_id, new_status)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
        
        return jsonify({
            'success': True,
            'key_pair': key_pair.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/<key_id>', methods=['DELETE'])
def delete_key_pair(key_id):
    """Delete a key pair"""
    try:
        # Get key pair info before deleting
        key_pair = key_pair_store.get(key_id)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
        
        # Delete the connection record from doctor_patient_connections
        try:
            from app.utils.supabase_client import get_supabase_admin_client
            supabase = get_supabase_admin_client()
            supabase.table('doctor_patient_connections').delete().match({
                'doctor_id': key_pair.doctor_id,
                'patient_id': key_pair.patient_id
            }).execute()
        except Exception as conn_err:
             print(f"Warning: Failed to delete connection record: {conn_err}")
        
        # Delete the key pair
        success = key_pair_store.delete(key_id)
        
        # Log audit event
        log_audit(
            user_id=None,
            action='key_delete',
            resource_type='key',
            resource_id=key_id,
            details=f"Deleted key pair {key_id} ({key_pair.doctor_id} → {key_pair.patient_id})",
            result='success'
        )
        
        return jsonify({
            'success': True,
            'message': 'Connection deleted successfully'
        }), 200
        
    except Exception as e:
        log_audit(
            user_id=None,
            action='key_delete',
            resource_type='key',
            resource_id=key_id,
            details=f"Failed to delete key pair {key_id}",
            result='failure',
            error_message=str(e)
        )
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/qr/<key_id>', methods=['GET'])
def get_qr_code(key_id):
    """Generate QR code for an existing key pair"""
    try:
        key_pair = key_pair_store.get(key_id)
        if not key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
        
        # Decrypt key for QR code
        try:
            from config import Config
            decrypted_key = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
        except Exception as dec_err:
            return jsonify({'error': f'Failed to decrypt key: {str(dec_err)}'}), 500
        
        # Generate QR code
        qr_data = {
            'key_id': key_pair.key_id,
            'key': decrypted_key,
            'doctor_id': key_pair.doctor_id,
            'patient_id': key_pair.patient_id
        }
        qr_code = QRCodeGenerator.generate_connection_qr(qr_data, size=300)
        
        return jsonify({
            'success': True,
            'qr_code': f'data:image/png;base64,{qr_code}',
            'expires_at': key_pair.expires_at.isoformat() if key_pair.expires_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/<key_id>/refresh', methods=['POST'])
def refresh_key_pair(key_id):
    try:
        # Get old key pair
        old_key_pair = key_pair_store.get(key_id)
        if not old_key_pair:
            return jsonify({'error': 'Key pair not found'}), 404
            
        doctor_id = old_key_pair.doctor_id
        patient_id = old_key_pair.patient_id
        
        # Revoke old key
        key_pair_store.update_status(key_id, 'Revoked')
        
        # Generate NEW encryption key (DEK)
        encryption_key = EncryptionManager.generate_key()
        key_b64 = EncryptionManager.key_to_base64(encryption_key)
        # Encrypt the DEK for storage
        from config import Config
        encrypted_key_b64 = EncryptionManager.encrypt_dek(key_b64, Config.MASTER_KEY)
        
        # Generate new key pair ID
        new_key_id = EncryptionManager.generate_key_pair_id()
        
        # Create new key pair
        new_key_pair = KeyPair(
            key_id=new_key_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            encryption_key=encrypted_key_b64,
            status='Pending', # Start as Pending until scanned
            expires_at=datetime.utcnow() + timedelta(days=60)
        )
        
        # Store new key pair
        key_pair_store.create(new_key_pair)
        
        # Log rotation
        log_audit(
            user_id=None,
            action='key_rotate',
            resource_type='key',
            resource_id=new_key_id,
            details=f"Rotated key {key_id} to {new_key_id} for {doctor_id} → {patient_id}",
            result='success',
            metadata={'old_key_id': key_id, 'new_key_id': new_key_id}
        )
        
        # Generate QR code for NEW key
        qr_data = {
            'key_id': new_key_id,
            'key': key_b64,
            'doctor_id': doctor_id,
            'patient_id': patient_id
        }
        qr_code = QRCodeGenerator.generate_connection_qr(qr_data, size=300)
        
        return jsonify({
            'success': True,
            'message': 'Key rotated successfully. Please scan the new QR code.',
            'old_key_id': key_id,
            'new_key_pair': new_key_pair.to_dict(),
            'qr_code': f'data:image/png;base64,{qr_code}'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/scan', methods=['POST'])
def scan_qr_code():
    try:
        data = request.get_json()
        qr_data_str = data.get('qr_data')
        
        if not qr_data_str:
            return jsonify({'error': 'No QR data provided'}), 400
            
        # Parse QR data (assuming it's a JSON string)
        try:
            qr_data = json.loads(qr_data_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid QR code format'}), 400
            
        key_id = qr_data.get('key_id')
        doctor_id = qr_data.get('doctor_id')
        patient_id = qr_data.get('patient_id')
        
        if not key_id or not doctor_id or not patient_id:
            return jsonify({'error': 'Incomplete QR code data'}), 400
            
        # Verify key exists and is active
        key_pair = key_pair_store.get(key_id)
        if not key_pair:
            return jsonify({'error': 'Invalid key pair'}), 404
            
        if key_pair.status not in ['Active', 'Pending']:
            return jsonify({'error': 'Key pair is not active or pending'}), 403
            
        # Check Expiration
        if key_pair.expires_at:
             # Ensure we compare like with like (Convert both to naive UTC)
             expires_at_naive = key_pair.expires_at.replace(tzinfo=None)
             if expires_at_naive < datetime.utcnow():
                return jsonify({'error': 'Key pair has expired'}), 403
        
        # Verify participants match
        if key_pair.doctor_id != doctor_id or key_pair.patient_id != patient_id:
            return jsonify({'error': 'Key pair mismatch'}), 403
        
        # If Pending, activate it now (First scan)
        if key_pair.status == 'Pending':
            key_pair = key_pair_store.update_status(key_id, 'Active')
            
            log_audit(
                user_id=None,
                action='pairing_scan',
                resource_type='key',
                resource_id=key_id,
                details=f"Key pair activated via scan: {doctor_id} <-> {patient_id}",
                result='success'
            )
            
        # Decrypt key to return to user
        try:
            from config import Config
            decrypted_key = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
        except Exception as dec_err:
            log_audit(
                user_id=None,
                action='pairing_scan',
                resource_type='key',
                resource_id=key_id,
                details=f"Decryption failed for key {key_id}",
                result='failure',
                error_message=str(dec_err)
            )
            return jsonify({'error': 'Failed to decrypt key'}), 500
        
        # Log successful scan
        log_audit(
            user_id=None,
            action='pairing_scan',
            resource_type='key',
            resource_id=key_id,
            details=f"QR code scanned for {doctor_id} <-> {patient_id}",
            result='success'
        )
        
        try:
            from app.utils.supabase_client import get_supabase_admin_client
            supabase = get_supabase_admin_client()
            
            # Upsert connection to avoid duplicates
            connection_data = {
                'doctor_id': key_pair.doctor_id,
                'patient_id': key_pair.patient_id,
            }
            # We use upsert if we have a unique constraint, or insert with ignore
            supabase.table('doctor_patient_connections').insert(connection_data).execute()
            
            log_audit(
                user_id=None,
                action='pairing_create',
                resource_type='connection',
                details=f"Connection record created: {doctor_id} <-> {patient_id}",
                result='success'
            )
        except Exception as conn_err:
            print(f"Connection persistence warning: {conn_err}")
        
        # Prepare response using model's dictionary method
        connection_data = key_pair.to_dict()
        connection_data['key'] = decrypted_key 
        
        return jsonify({
            'success': True,
            'connection': connection_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@keys_bp.route('/connections/<user_id>', methods=['GET'])
def get_user_connections(user_id):
    """
    Get all connections (key pairs) for a user (doctor or patient)
    """
    try:
        connections = key_pair_store.list_by_user(user_id)
        
        return jsonify({
            'success': True,
            'connections': [kp.to_dict() for kp in connections]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500