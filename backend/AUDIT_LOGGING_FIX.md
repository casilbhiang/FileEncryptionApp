# Audit Logging Fix - User Created & Password Reset Events

## Problem
The audit logs page is not showing "User Created", "Password Reset", and other events even though the backend code is calling the `log_simple_auth_event` RPC function when these actions occur.

## Root Cause
The `log_simple_auth_event` function in your Supabase database either:
1. Does not exist
2. Has incorrect permissions
3. Is not properly mapping event types to action names
4. Is failing silently when inserting records

## Solution
You need to create or update the `log_simple_auth_event` function in your Supabase database.

## Steps to Fix

### 1. Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section in the left sidebar
3. Click **New Query**

### 2. Run the SQL Fix Script
Copy and paste the contents of `fix_audit_logging.sql` into the SQL editor and run it.

This script will:
- Create the `log_simple_auth_event` function with proper event type mapping
- Map backend event types to human-readable action names:
  - `user_created` → "User Created"
  - `password_reset` → "Password Reset"
  - `login_success` → "Login Success"
  - `login_failed` → "Login Failed"
  - `otp_sent` → "Otp Sent"
  - `logout` → "Logout"
- Grant proper execution permissions to authenticated users and service role
- Handle errors gracefully without breaking the main transaction

### 3. Verify the Function Exists
After running the script, verify the function was created:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'log_simple_auth_event';
```

You should see one row returned.

### 4. Test the Function
Try creating a new user or resetting a password from your admin panel. Then check the audit logs:

```sql
SELECT * FROM public.audit_logs
ORDER BY timestamp DESC
LIMIT 10;
```

You should now see "User Created" and "Password Reset" entries.

### 5. Check Frontend
1. Log in as admin
2. Navigate to **Audit Logs** page
3. Click on the "All Actions" dropdown
4. You should now see:
   - Login Success
   - Otp Sent
   - User Created ✅ (newly fixed)
   - Password Reset ✅ (newly fixed)
   - Logout
   - And any other actions that have occurred

## Backend Code Reference
The backend is correctly calling the function in these locations:

### User Creation ([auth.py:182-194](../backend/app/api/auth.py))
```python
rpc_response = supabase.rpc('log_simple_auth_event', {
    'p_user_id': response.data[0]['id'],
    'p_event_type': 'user_created',
    'p_email': email
}).execute()
```

### Password Reset ([auth.py:631-643](../backend/app/api/auth.py))
```python
rpc_response = supabase.rpc('log_simple_auth_event', {
    'p_user_id': user['id'],
    'p_event_type': 'password_reset',
    'p_email': user['email']
}).execute()
```

## Expected Behavior After Fix
- ✅ Admin creates a new user → "User Created" event appears in audit logs
- ✅ Admin resets user password → "Password Reset" event appears in audit logs
- ✅ Audit logs dropdown dynamically shows all action types including the newly logged events
- ✅ All events include proper user_id, timestamp, target (email), and result (OK/FAILED)

## File Logs Page
A new **File Logs** page has been created to specifically track file operations:
- File uploads
- File sharing events
- Access levels (Read/Write)
- Share status (Active/Revoked)

Access it via: Admin Sidebar → **File Logs**

## Technical Details

### Event Type Mapping
| Backend Event Type | Audit Log Action Name |
|-------------------|-----------------------|
| `user_created` | User Created |
| `password_reset` | Password Reset |
| `login_success` | Login Success |
| `login_failed` | Login Failed |
| `otp_sent` | Otp Sent |
| `logout` | Logout |

### Function Signature
```sql
log_simple_auth_event(
    p_user_id UUID,           -- User's UUID from auth.users
    p_event_type TEXT,        -- Event type (user_created, password_reset, etc.)
    p_email TEXT,             -- User's email (optional)
    p_error_message TEXT,     -- Error message for failed events (optional)
    p_metadata JSONB          -- Additional metadata (optional)
)
```

### Audit Logs Table Structure
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    user_id VARCHAR(255),     -- Custom user_id (e.g., KYJHOPAT-67I)
    action VARCHAR(100),      -- Human-readable action name
    target TEXT,              -- Email or target user
    result VARCHAR(50),       -- OK or FAILED
    details TEXT,             -- Description
    metadata JSONB,           -- Additional data
    created_at TIMESTAMPTZ
);
```

## Troubleshooting

### If events still don't appear:
1. Check Supabase logs for any errors
2. Verify RLS policies allow inserts to `audit_logs` table
3. Check that the function has proper permissions
4. Look at backend console logs for any RPC errors

### Check Backend Logs:
The backend logs helpful debug messages:
```
Attempting to log user creation event for user_id: <uuid>
User creation log result: <response>
```

If you see errors in these logs, the function may not be executing properly.

## Summary
After running the `fix_audit_logging.sql` script in Supabase, your audit logging will work correctly and all user creation and password reset events will be properly tracked and displayed in the admin audit logs page.
