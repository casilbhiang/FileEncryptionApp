"""
API endpoints for audit logs
"""
from flask import Blueprint, request, jsonify
from app.utils.supabase_client import get_supabase_admin_client
from datetime import datetime

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs from both login_audit (auth events) and audit_logs (all other events)"""
    try:
        user_id = request.args.get('user_id')
        action = request.args.get('action')
        result = request.args.get('result')
        search_query = request.args.get('search')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        exclude_keys = request.args.get('exclude_keys', 'false').lower() == 'true'

        supabase = get_supabase_admin_client()

        # Fetch from login_audit table (authentication events)
        login_query = supabase.table('login_audit').select('*, users(user_id, full_name, email, role)')
        login_query = login_query.order('created_at', desc=True)
        login_response = login_query.execute()

        # Try to fetch from audit_logs table (all other system events)
        # This table may not exist yet, so handle gracefully
        audit_response = None
        try:
            # Attempt 1: Fetch with join (requires FK)
            audit_query = supabase.table('audit_logs').select('*, users(user_id, full_name, email, role)')
            audit_query = audit_query.order('created_at', desc=True)
            audit_response = audit_query.execute()
        except Exception as audit_error:
            print(f"Join query failed (likely missing FK): {audit_error}")
            try:
                # Attempt 2: Fetch raw logs without join
                audit_query = supabase.table('audit_logs').select('*')
                audit_query = audit_query.order('created_at', desc=True)
                audit_response = audit_query.execute()
            except Exception as e:
                print(f"Fallback query failed: {e}")
                audit_response = type('obj', (object,), {'data': []})()  # Empty response

        # Format logs for frontend
        formatted_logs = []

        # Process login_audit logs (authentication events)
        for log in login_response.data:
            user_info = log.get('users', {})
            user_name = user_info.get('full_name', 'Unknown User') if user_info else 'Unknown User'
            user_id_display = user_info.get('user_id', 'N/A') if user_info else 'N/A'

            # Format timestamp
            timestamp = log.get('created_at', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass

            # Determine result based on error message
            event_type = log.get('event_type', 'login')
            error_message = log.get('error_message', '')
            result_status = 'FAILED' if error_message else 'OK'

            # Format action
            action_display = event_type.replace('_', ' ').title()

            # Format target
            target = log.get('email', user_id_display)

            formatted_log = {
                'id': str(log.get('id', '')),
                'timestamp': timestamp,
                'user': f"{user_name} ({user_id_display})",
                'action': action_display,
                'target': target,
                'result': result_status,
                'details': error_message or ''
            }

            # Apply filters
            if action and action.lower() not in action_display.lower():
                continue
            if result and result.upper() != result_status:
                continue
            if search_query:
                search_lower = search_query.lower()
                if not (search_lower in formatted_log['user'].lower() or
                       search_lower in formatted_log['action'].lower() or
                       search_lower in formatted_log['target'].lower()):
                    continue

            formatted_logs.append(formatted_log)

        # Process audit_logs (all other system events)
        for log in audit_response.data:
            user_info = log.get('users', {})
            user_name = user_info.get('full_name', 'System') if user_info else 'System'
            user_id_display = user_info.get('user_id', 'N/A') if user_info else 'N/A'

            # Format timestamp
            timestamp = log.get('created_at', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass

            # Get result
            result_status = 'FAILED' if log.get('result') == 'failure' else 'OK'
            error_message = log.get('error_message', '')

            # Format action
            action_text = log.get('action', 'Unknown')
            action_display = action_text.replace('_', ' ').title()

            # Format target
            resource_type = log.get('resource_type', '')
            resource_id = log.get('resource_id', '')
            details = log.get('details', '')

            if resource_type and resource_id:
                target = f"{resource_type}: {resource_id}"
            elif details:
                target = details
            else:
                target = resource_type or 'N/A'

            formatted_log = {
                'id': str(log.get('id', '')),
                'timestamp': timestamp,
                'user': f"{user_name} ({user_id_display})" if user_info else 'System',
                'action': action_display,
                'target': target,
                'result': result_status,
                'details': error_message or details or ''
            }

            # Apply filters
            if action and action.lower() not in action_display.lower():
                continue
            if result and result.upper() != result_status:
                continue
            if search_query:
                search_lower = search_query.lower()
                if not (search_lower in formatted_log['user'].lower() or
                       search_lower in formatted_log['action'].lower() or
                       search_lower in formatted_log['target'].lower()):
                    continue

            formatted_logs.append(formatted_log)

        # Filter out KEY/PAIRING events if requested (audit logs page excludes these)
        if exclude_keys:
            formatted_logs = [
                log for log in formatted_logs
                if log['action'].upper() == 'KEY_DELETE' or
                ('KEY' not in log['action'].upper() and 'PAIRING' not in log['action'].upper())
            ]

        # Sort all logs by timestamp (newest first)
        formatted_logs.sort(key=lambda x: x['timestamp'], reverse=True)

        # Pagination
        total_logs = len(formatted_logs)
        total_pages = max(1, (total_logs + per_page - 1) // per_page)
        page = min(page, total_pages)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_logs = formatted_logs[start:end]

        return jsonify({
            'success': True,
            'logs': paginated_logs,
            'count': len(paginated_logs),
            'total': total_logs,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        }), 200

    except Exception as e:
        print(f"Get audit logs error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@audit_bp.route('/logs/stats', methods=['GET'])
def get_audit_stats():
    """Get audit log statistics from both login_audit and audit_logs tables"""
    try:
        supabase = get_supabase_admin_client()

        # Fetch from login_audit
        login_response = supabase.table('login_audit').select('event_type, error_message').execute()

        # Fetch from audit_logs
        audit_response = supabase.table('audit_logs').select('action, result, error_message').execute()

        all_logs = []

        # Process login_audit logs
        for log in login_response.data:
            all_logs.append({
                'action': log.get('event_type', 'Unknown'),
                'success': not log.get('error_message')
            })

        # Process audit_logs
        for log in audit_response.data:
            all_logs.append({
                'action': log.get('action', 'Unknown'),
                'success': log.get('result') != 'failure'
            })

        # Calculate stats
        total_logs = len(all_logs)
        success_count = len([log for log in all_logs if log['success']])
        failed_count = len([log for log in all_logs if not log['success']])

        # Count by action type
        action_counts = {}
        for log in all_logs:
            action = log['action']
            action_counts[action] = action_counts.get(action, 0) + 1

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
        print(f"Get audit stats error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
