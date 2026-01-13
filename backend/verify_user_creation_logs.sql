-- Verify user creation audit logs were added correctly
-- Run this to see the details of the logs

-- Show all user creation logs with full details
SELECT
    timestamp,
    user_id,
    action,
    target,
    result,
    details,
    metadata
FROM public.audit_logs
WHERE action = 'user_created'
ORDER BY timestamp ASC;

-- Count by date
SELECT
    DATE(timestamp) as creation_date,
    COUNT(*) as users_created
FROM public.audit_logs
WHERE action = 'user_created'
GROUP BY DATE(timestamp)
ORDER BY creation_date ASC;

-- Summary statistics
SELECT
    COUNT(*) as total_logs,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as earliest_creation,
    MAX(timestamp) as latest_creation
FROM public.audit_logs
WHERE action = 'user_created';
