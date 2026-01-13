-- Add "User Created" audit log entries for all existing users
-- This script creates audit logs based on the users.created_at timestamp
-- Run this in Supabase SQL Editor

-- Insert audit logs for user creation events
INSERT INTO public.audit_logs (
    timestamp,
    user_id,
    action,
    target,
    result,
    details,
    metadata,
    created_at
)
SELECT
    u.created_at AS timestamp,                    -- Use the user's creation timestamp
    u.user_id AS user_id,                          -- The user who was created
    'user_created' AS action,                      -- Action type
    u.email AS target,                             -- Target is the user's email
    'success' AS result,                           -- Result is success
    CONCAT('User account created: ', u.full_name, ' (', u.role, ')') AS details,  -- Description
    jsonb_build_object(
        'user_id', u.user_id,
        'email', u.email,
        'full_name', u.full_name,
        'role', u.role,
        'created_by', 'system'                     -- Indicate system/admin created
    ) AS metadata,
    u.created_at AS created_at                     -- Same as timestamp
FROM public.users u
WHERE NOT EXISTS (
    -- Don't create duplicate entries if they already exist
    SELECT 1
    FROM public.audit_logs al
    WHERE al.user_id = u.user_id
    AND al.action = 'user_created'
    AND al.timestamp = u.created_at
)
ORDER BY u.created_at ASC;

-- Verify the inserted logs
SELECT
    timestamp,
    user_id,
    action,
    target,
    result,
    details
FROM public.audit_logs
WHERE action = 'user_created'
ORDER BY timestamp DESC;

-- Show summary
SELECT
    COUNT(*) AS total_user_creation_logs,
    MIN(timestamp) AS earliest_creation,
    MAX(timestamp) AS latest_creation
FROM public.audit_logs
WHERE action = 'user_created';
