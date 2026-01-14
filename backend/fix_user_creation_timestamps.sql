-- Fix the timestamps for user creation logs to use actual creation dates
-- This will update the existing logs to show when users were really created

-- First, let's see the current state
SELECT
    al.timestamp as audit_log_timestamp,
    u.created_at as actual_user_creation,
    al.user_id,
    al.details
FROM public.audit_logs al
JOIN public.users u ON al.user_id = u.user_id
WHERE al.action = 'user_created'
ORDER BY u.created_at ASC;

-- Now update the timestamps to match the actual user creation dates
UPDATE public.audit_logs al
SET
    timestamp = u.created_at,
    created_at = u.created_at
FROM public.users u
WHERE al.user_id = u.user_id
AND al.action = 'user_created';

-- Verify the update worked
SELECT
    timestamp,
    user_id,
    action,
    details
FROM public.audit_logs
WHERE action = 'user_created'
ORDER BY timestamp ASC;

-- Show summary
SELECT
    'Timestamps updated successfully' as status,
    COUNT(*) as total_updated,
    MIN(timestamp) as earliest_creation,
    MAX(timestamp) as latest_creation
FROM public.audit_logs
WHERE action = 'user_created';
