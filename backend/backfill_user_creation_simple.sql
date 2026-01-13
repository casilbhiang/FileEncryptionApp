-- Simple approach: Insert user creation audit logs directly
-- This combines data from the users table to create audit log entries

-- First, check the current audit_logs table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Check current audit logs count
SELECT COUNT(*) as current_audit_logs FROM public.audit_logs;

-- Now insert user creation logs directly
INSERT INTO public.audit_logs (
    timestamp,
    user_id,
    action,
    target,
    result,
    details,
    metadata
)
SELECT
    u.created_at,                                   -- When user was created
    u.user_id,                                       -- User's compound ID (JODOC-65G, etc)
    'user_created',                                  -- Action type
    u.email,                                         -- Target email
    'success',                                       -- Result
    'User account created: ' || u.full_name || ' (' || u.role || ')',  -- Details
    json_build_object(
        'user_id', u.user_id,
        'email', u.email,
        'full_name', u.full_name,
        'role', u.role,
        'nric', LEFT(u.nric, 5) || '***',           -- Partial NRIC for privacy
        'created_by', 'system'
    )::jsonb
FROM public.users u
ORDER BY u.created_at ASC;

-- Show what was inserted
SELECT
    timestamp,
    user_id,
    action,
    target,
    details
FROM public.audit_logs
WHERE action = 'user_created'
ORDER BY timestamp DESC;

-- Show summary
SELECT
    'User creation logs added: ' || COUNT(*) as summary
FROM public.audit_logs
WHERE action = 'user_created';
