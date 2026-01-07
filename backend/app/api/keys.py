"""
API endpoints for encryption key management
"""
from flask import Blueprint, request, jsonify
from app.crypto.encryption import EncryptionManager
from app.crypto.qr_generator import QRCodeGenerator
from app.models.encryption_models import KeyPair
from app.models.storage import key_pair_store
from app.utils.audit import audit_logger, AuditAction, AuditResult
import json

keys_bp = Blueprint('keys', __name__)


@keys_bp.route('/generate', methods=['POST'])
def generate_key_pair():
    """
    Generate a new encryption key pair for doctor-patient
    """
    try:
        data = request.get_json()
        doctor_id = data.get('doctor_id')
        patient_id = data.get('patient_id')
        
        if not doctor_id or not patient_id:
            return jsonify({'error': 'doctor_id and patient_id are required'}), 400
        
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
            status='Active'
        )
        
        # Store key pair
        key_pair_store.create(key_pair)
        
        # Log audit event
        audit_logger.log(
            user_id="ADMIN",  # TODO: Get from auth context
            user_name="System Admin",  # TODO: Get from auth context
            action=AuditAction.KEY_GENERATE,
            target=f"{doctor_id} → {patient_id}",
            result=AuditResult.OK,
            details=f"Generated key pair {key_id}"
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
        audit_logger.log(
            user_id="ADMIN",
            user_name="System Admin",
            action=AuditAction.KEY_GENERATE,
            target=f"{data.get('doctor_id', 'unknown')} → {data.get('patient_id', 'unknown')}",
            result=AuditResult.FAILED,
            details=str(e)
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
        
        # Delete the key pair
        success = key_pair_store.delete(key_id)
        
        # Log audit event
        audit_logger.log(
            user_id="ADMIN",
            user_name="System Admin",
            action=AuditAction.KEY_DELETE,
            target=f"{key_pair.doctor_id} → {key_pair.patient_id} ({key_id})",
            result=AuditResult.OK,
            details=f"Deleted key pair {key_id}"
        )
        
        return jsonify({
            'success': True,
            'message': 'Key pair deleted successfully'
        }), 200
        
    except Exception as e:
        audit_logger.log(
            user_id="ADMIN",
            user_name="System Admin",
            action=AuditAction.KEY_DELETE,
            target=key_id,
            result=AuditResult.FAILED,
            details=str(e)
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
            'qr_code': f'data:image/png;base64,{qr_code}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@keys_bp.route('/scan', methods=['POST'])
def scan_qr_code():
    """
    Verify scanned QR code data and establish connection
    """
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
            
        if key_pair.status != 'Active':
            return jsonify({'error': 'Key pair is not active'}), 403
            
        # Verify participants match
        if key_pair.doctor_id != doctor_id or key_pair.patient_id != patient_id:
            return jsonify({'error': 'Key pair mismatch'}), 403
            
        # Decrypt key to return to user
        try:
            from config import Config
            decrypted_key = EncryptionManager.decrypt_dek(key_pair.encryption_key, Config.MASTER_KEY)
        except Exception as dec_err:
            audit_logger.log(
                user_id="SYSTEM",  # System verifying
                user_name="System",
                action=AuditAction.PAIRING_SCAN,
                target=f"Key {key_id}",
                result=AuditResult.FAILED,
                details=f"Decryption failed: {str(dec_err)}"
            )
            return jsonify({'error': 'Failed to decrypt key'}), 500
        
        # Log successful scan
        audit_logger.log(
            user_id="SYSTEM",
            user_name="System",
            action=AuditAction.PAIRING_SCAN,
            target=f"{key_pair.doctor_id} <-> {key_pair.patient_id}",
            result=AuditResult.OK,
            details=f"QR code scanned for key {key_id}"
        )

        # Persist Connection in Supabase
        # This allows the "My Patients" or "My Doctors" lists to work
        try:
            from app.utils.supabase_client import get_supabase_admin_client
            supabase = get_supabase_admin_client()
            
            # Upsert connection to avoid duplicates
            connection_data = {
                'doctor_id': key_pair.doctor_id,
                'patient_id': key_pair.patient_id,
                # 'status': 'active' # If table has status
            }
            # We use upsert if we have a unique constraint, or insert with ignore
            # For now, simple insert. If it fails due to duplicates, we catch it.
            supabase.table('doctor_patient_connections').insert(connection_data).execute()
            
            audit_logger.log(
                user_id="SYSTEM",
                user_name="System",
                action=AuditAction.PAIRING_CREATE,
                target=f"{key_pair.doctor_id} <-> {key_pair.patient_id}",
                result=AuditResult.OK,
                details="Connection record created"
            )
        except Exception as conn_err:
            print(f"Connection persistence warning: {conn_err}")
            # We don't fail the request if this fails (it might be a duplicate)
        
        return jsonify({
            'success': True,
            'connection': {
                'key_id': key_pair.key_id,
                'key': decrypted_key,
                'doctor_id': key_pair.doctor_id,
                'patient_id': key_pair.patient_id,
                'status': key_pair.status
            }
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
            'connections': [
                {
                    'key_id': kp.key_id,
                    'doctor_id': kp.doctor_id,
                    'patient_id': kp.patient_id,
                    'status': kp.status,
                    'created_at': kp.created_at.isoformat() if kp.created_at else None
                }
                for kp in connections
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
