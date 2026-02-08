"""
Audit logging system for tracking all system events
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum


class AuditAction(Enum):
    """Audit action types"""
    # Key Management
    KEY_GENERATE = "KEY_GENERATE"
    KEY_DELETE = "KEY_DELETE"
    KEY_REVOKE = "KEY_REVOKE"
    KEY_ACTIVATE = "KEY_ACTIVATE"
    
    # File Operations
    FILE_ENCRYPT = "FILE_ENCRYPT"
    FILE_DECRYPT = "FILE_DECRYPT"
    FILE_UPLOAD = "FILE_UPLOAD"
    FILE_DOWNLOAD = "FILE_DOWNLOAD"
    FILE_DELETE = "FILE_DELETE"
    FILE_SHARE = "FILE_SHARE"
    
    # Pairing
    PAIRING_CREATE = "PAIRING_CREATE"
    PAIRING_SCAN = "PAIRING_SCAN"
    PAIRING_VERIFY_PIN = "PAIRING_VERIFY_PIN"
    PAIRING_EXPIRE = "PAIRING_EXPIRE"
    
    # User Management
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_CREATE = "USER_CREATE"
    USER_DELETE = "USER_DELETE"


class AuditResult(Enum):
    """Audit result types"""
    OK = "OK"
    FAILED = "FAILED"


class AuditLog:
    """Represents an audit log entry"""
    
    def __init__(
        self,
        user_id: str,
        user_name: str,
        action: AuditAction,
        target: str,
        result: AuditResult = AuditResult.OK,
        details: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ):
        self.id = None  # Will be set by store
        self.user_id = user_id
        self.user_name = user_name
        self.action = action.value if isinstance(action, AuditAction) else action
        self.target = target
        self.result = result.value if isinstance(result, AuditResult) else result
        self.details = details
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%d/%m/%Y, %H:%M'),
            'user': f"{self.user_name} (#{self.user_id})",
            'action': self.action,
            'target': self.target,
            'result': self.result,
            'details': self.details
        }


class AuditLogger:
    """Manages audit log storage and retrieval"""
    
    def __init__(self):
        self._logs: List[AuditLog] = [] # Keeping in-memory as a fallback/cache if needed
        self._next_id = 1
    
    def log(
        self,
        user_id: str,
        user_name: str,
        action: AuditAction,
        target: str,
        result: AuditResult = AuditResult.OK,
        details: Optional[str] = None
    ) -> Optional[AuditLog]:
        """Create a new audit log entry and save to Supabase"""
        try:
            from app.utils.supabase_client import get_supabase_admin_client
            supabase = get_supabase_admin_client()
            
            # Prepare data for Supabase
            log_data = {
                'user_id': user_id if user_id and user_id != 'ADMIN' and user_id != 'SYSTEM' else None, 
                'action': action.value if isinstance(action, AuditAction) else action,
                'target': target,
                'result': result.value if isinstance(result, AuditResult) else result,
                'details': details or '',
                'metadata': {
                    'user_name': user_name,
                    'user_id_original': user_id
                }
            }
            
            import uuid
            try:
                if user_id and user_id not in ['ADMIN', 'SYSTEM']:
                    uuid.UUID(str(user_id))
                    log_data['user_id'] = user_id
                else:
                    log_data['user_id'] = None # System events might not have a linked user
            except ValueError:
                log_data['user_id'] = None

            # Insert into Supabase
            response = supabase.table('audit_logs').insert(log_data).execute()
            
            if response.data:
                # Log success
                print(f"[AUDIT SUCCESS] Saved to DB: {action}")
                # Create local object for return (optional)
                log_entry = AuditLog(
                    user_id=user_id,
                    user_name=user_name,
                    action=action,
                    target=target,
                    result=result,
                    details=details
                )
                return log_entry
            else:
                print(f"[AUDIT FAILURE] Supabase returned no data")
                return None

        except Exception as e:
            print(f"[AUDIT ERROR] Failed to save audit log: {e}")
            return None

    def get_all(self) -> List[AuditLog]:
        """Deprecated: Use API endpoint"""
        return []
    
    def get_by_user(self, user_id: str) -> List[AuditLog]:
        """Deprecated: Use API endpoint"""
        return []
    
    def get_by_action(self, action: AuditAction) -> List[AuditLog]:
        """Deprecated: Use API endpoint"""
        return []
    
    def get_by_result(self, result: AuditResult) -> List[AuditLog]:
        """Deprecated: Use API endpoint"""
        return []

    def search(self, **kwargs) -> List[AuditLog]:
        """Deprecated: Use API endpoint"""
        return []

# Global audit logger instance
audit_logger = AuditLogger()
