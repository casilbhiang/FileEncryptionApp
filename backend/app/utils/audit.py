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
        self._logs: List[AuditLog] = []
        self._next_id = 1
    
    def log(
        self,
        user_id: str,
        user_name: str,
        action: AuditAction,
        target: str,
        result: AuditResult = AuditResult.OK,
        details: Optional[str] = None
    ) -> AuditLog:
        """Create a new audit log entry"""
        log_entry = AuditLog(
            user_id=user_id,
            user_name=user_name,
            action=action,
            target=target,
            result=result,
            details=details
        )
        log_entry.id = str(self._next_id)
        self._next_id += 1
        
        self._logs.insert(0, log_entry)  # Insert at beginning for newest first
        
        # Print to console for debugging
        print(f"[AUDIT] {log_entry.user_name} - {log_entry.action} - {log_entry.target} - {log_entry.result}")
        
        return log_entry
    
    def get_all(self) -> List[AuditLog]:
        """Get all audit logs"""
        return self._logs
    
    def get_by_user(self, user_id: str) -> List[AuditLog]:
        """Get audit logs for a specific user"""
        return [log for log in self._logs if log.user_id == user_id]
    
    def get_by_action(self, action: AuditAction) -> List[AuditLog]:
        """Get audit logs for a specific action type"""
        action_value = action.value if isinstance(action, AuditAction) else action
        return [log for log in self._logs if log.action == action_value]
    
    def get_by_result(self, result: AuditResult) -> List[AuditLog]:
        """Get audit logs by result"""
        result_value = result.value if isinstance(result, AuditResult) else result
        return [log for log in self._logs if log.result == result_value]
    
    def search(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        result: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[AuditLog]:
        """Search audit logs with filters"""
        filtered_logs = self._logs
        
        if user_id:
            filtered_logs = [log for log in filtered_logs if log.user_id == user_id]
        
        if action:
            filtered_logs = [log for log in filtered_logs if action.upper() in log.action]
        
        if result:
            filtered_logs = [log for log in filtered_logs if log.result == result.upper()]
        
        if search_query:
            query_lower = search_query.lower()
            filtered_logs = [
                log for log in filtered_logs
                if (query_lower in log.user_name.lower() or
                    query_lower in log.action.lower() or
                    query_lower in log.target.lower())
            ]
        
        return filtered_logs


# Global audit logger instance
audit_logger = AuditLogger()
