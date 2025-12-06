-- Create a new simplified function with a different name to avoid conflicts
-- This won't interfere with the existing log_auth_event functions
-- This version accepts NULL user_id for failed login attempts where user doesn't exist

CREATE OR REPLACE FUNCTION log_simple_auth_event(
    p_user_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the authentication event into login_audit table
    -- user_id can be NULL for failed login attempts
    INSERT INTO login_audit (user_id, event_type, email, error_message)
    VALUES (p_user_id, p_event_type, p_email, p_error_message);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO anon;
