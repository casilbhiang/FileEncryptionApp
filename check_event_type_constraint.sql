-- Check the event_type constraint on login_audit table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'login_audit'::regclass
AND conname LIKE '%event_type%';

-- Also check what values are currently being used
SELECT DISTINCT event_type
FROM login_audit
ORDER BY event_type;
