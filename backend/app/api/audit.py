"""
API endpoints for audit logs
"""
from flask import Blueprint, request, jsonify
from app.utils.audit import audit_logger

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs with optional filters"""
    try:
        user_id = request.args.get('user_id')
        action = request.args.get('action')
        result = request.args.get('result')
        search_query = request.args.get('search')
        
        # Get filtered logs
        logs = audit_logger.search(
            user_id=user_id,
            action=action,
            result=result,
            search_query=search_query
        )
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs],
            'count': len(logs)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@audit_bp.route('/logs/stats', methods=['GET'])
def get_audit_stats():
    """Get audit log statistics"""
    try:
        all_logs = audit_logger.get_all()
        
        # Calculate stats
        total_logs = len(all_logs)
        success_count = len([log for log in all_logs if log.result == 'OK'])
        failed_count = len([log for log in all_logs if log.result == 'FAILED'])
        
        # Count by action type
        action_counts = {}
        for log in all_logs:
            action_counts[log.action] = action_counts.get(log.action, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total_logs,
                'success': success_count,
                'failed': failed_count,
                'by_action': action_counts
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
