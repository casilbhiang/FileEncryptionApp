-- Check the structure of the login_audit table to ensure it matches the RPC function
-- Run this in Supabase SQL Editor to see the table structure

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'login_audit'
ORDER BY ordinal_position;

-- Also check if the log_auth_event function exists
SELECT
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'log_auth_event';
