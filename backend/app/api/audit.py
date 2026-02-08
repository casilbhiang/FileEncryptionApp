"""
API endpoints for audit logs
"""
from flask import Blueprint, request, jsonify
from app.utils.supabase_client import get_supabase_admin_client
from datetime import datetime, timedelta

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs from both login_audit (auth events) and audit_logs (all other events)"""
    try:
        user_id = request.args.get('user_id')
        action = request.args.get('action')
        result = request.args.get('result')
        search_query = request.args.get('search')
        date_filter = request.args.get('date')
        timezone_offset = request.args.get('timezone_offset', '0')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        exclude_keys = request.args.get('exclude_keys', 'false').lower() == 'true'
        keys_only = request.args.get('keys_only', 'false').lower() == 'true'

        supabase = get_supabase_admin_client()

        login_query = supabase.table('login_audit').select('*, users(user_id, full_name, email, role)')
        
        if date_filter:
            filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
            offset_minutes = int(timezone_offset)
            utc_start = filter_date + timedelta(minutes=offset_minutes)
            utc_end = utc_start + timedelta(days=1)
            start_iso = utc_start.strftime('%Y-%m-%dT%H:%M:%S')
            end_iso = utc_end.strftime('%Y-%m-%dT%H:%M:%S')
            login_query = login_query.gte('created_at', start_iso).lt('created_at', end_iso)
            
        login_query = login_query.order('created_at', desc=True)
        login_response = login_query.execute()

        audit_response = None
        try:
            audit_query = supabase.table('audit_logs').select('*, users(user_id, full_name, email, role)')
            
            if date_filter:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
                offset_minutes = int(timezone_offset)
                utc_start = filter_date + timedelta(minutes=offset_minutes)
                utc_end = utc_start + timedelta(days=1)
                start_iso = utc_start.strftime('%Y-%m-%dT%H:%M:%S')
                end_iso = utc_end.strftime('%Y-%m-%dT%H:%M:%S')
                audit_query = audit_query.gte('created_at', start_iso).lt('created_at', end_iso)
                
            audit_query = audit_query.order('created_at', desc=True)
            audit_response = audit_query.execute()
        except Exception as audit_error:
            print(f"Join query failed (likely missing FK): {audit_error}")
            try:
                audit_query = supabase.table('audit_logs').select('*')
                
                if date_filter:
                    filter_date = datetime.strptime(date_filter, '%Y-%m-%d')
                    offset_minutes = int(timezone_offset)
                    utc_start = filter_date + timedelta(minutes=offset_minutes)
                    utc_end = utc_start + timedelta(days=1)
                    start_iso = utc_start.strftime('%Y-%m-%dT%H:%M:%S')
                    end_iso = utc_end.strftime('%Y-%m-%dT%H:%M:%S')
                    audit_query = audit_query.gte('created_at', start_iso).lt('created_at', end_iso)
                    
                audit_query = audit_query.order('created_at', desc=True)
                audit_response = audit_query.execute()
            except Exception as e:
                print(f"Fallback query failed: {e}")
                audit_response = type('obj', (object,), {'data': []})()

        formatted_logs = []

        for log in login_response.data:
            user_info = log.get('users', {})
            user_name = user_info.get('full_name', 'Unknown User') if user_info else 'Unknown User'
            user_id_display = user_info.get('user_id', 'N/A') if user_info else 'N/A'

            timestamp = log.get('created_at', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    timestamp_str = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    timestamp_str = timestamp
            else:
                timestamp_str = ''

            event_type = log.get('event_type', 'login')
            error_message = log.get('error_message', '')
            result_status = 'FAILED' if error_message else 'OK'
            action_display = event_type.replace('_', ' ').title()
            target = log.get('email', user_id_display)

            formatted_log = {
                'id': str(log.get('id', '')),
                'timestamp': timestamp_str,
                'user': f"{user_name} ({user_id_display})",
                'action': action_display,
                'target': target,
                'result': result_status,
                'details': error_message or ''
            }

            if action and action.lower() not in action_display.lower():
                continue
            if result and result.upper() != result_status:
                continue
            if search_query:
                search_lower = search_query.lower()
                user_str = str(formatted_log.get('user', '') or '').lower()
                action_str = str(formatted_log.get('action', '') or '').lower()
                target_str = str(formatted_log.get('target', '') or '').lower()
                if not (search_lower in user_str or
                       search_lower in action_str or
                       search_lower in target_str):
                    continue

            formatted_logs.append(formatted_log)

        for log in audit_response.data:
            user_info = log.get('users', {})
            user_name = user_info.get('full_name', 'System') if user_info else 'System'
            user_id_display = user_info.get('user_id', 'N/A') if user_info else 'N/A'

            timestamp = log.get('created_at', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    timestamp_str = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    timestamp_str = timestamp
            else:
                timestamp_str = ''

            result_status = 'FAILED' if log.get('result') == 'failure' else 'OK'
            error_message = log.get('error_message', '')
            action_text = log.get('action', 'Unknown')
            action_display = action_text.replace('_', ' ').title()

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
                'timestamp': timestamp_str,
                'user': f"{user_name} ({user_id_display})" if user_info else 'System',
                'action': action_display,
                'target': target,
                'result': result_status,
                'details': error_message or details or ''
            }

            if action and action.lower() not in action_display.lower():
                continue
            if result and result.upper() != result_status:
                continue
            if search_query:
                search_lower = search_query.lower()
                user_str = str(formatted_log.get('user', '') or '').lower()
                action_str = str(formatted_log.get('action', '') or '').lower()
                target_str = str(formatted_log.get('target', '') or '').lower()
                if not (search_lower in user_str or
                       search_lower in action_str or
                       search_lower in target_str):
                    continue

            formatted_logs.append(formatted_log)

        if exclude_keys:
            formatted_logs = [
                log for log in formatted_logs
                if log['action'].upper() == 'KEY_DELETE' or
                ('KEY' not in log['action'].upper() and 'PAIRING' not in log['action'].upper())
            ]

        if keys_only:
            formatted_logs = [
                log for log in formatted_logs
                if 'KEY' in log['action'].upper() or 'PAIRING' in log['action'].upper()
            ]

        formatted_logs.sort(key=lambda x: x['timestamp'], reverse=True)

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

        login_response = supabase.table('login_audit').select('event_type, error_message').execute()
        audit_response = supabase.table('audit_logs').select('action, result, error_message').execute()

        all_logs = []

        for log in login_response.data:
            all_logs.append({
                'action': log.get('event_type', 'Unknown'),
                'success': not log.get('error_message')
            })

        for log in audit_response.data:
            all_logs.append({
                'action': log.get('action', 'Unknown'),
                'success': log.get('result') != 'failure'
            })

        total_logs = len(all_logs)
        success_count = len([log for log in all_logs if log['success']])
        failed_count = len([log for log in all_logs if not log['success']])

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