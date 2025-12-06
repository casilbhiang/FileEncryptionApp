-- Create the log_auth_event RPC function for logging authentication events
-- This function inserts records into the login_audit table

CREATE OR REPLACE FUNCTION log_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_email TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the authentication event into login_audit table
    INSERT INTO login_audit (user_id, event_type, email, error_message)
    VALUES (p_user_id, p_event_type, p_email, p_error_message);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_auth_event(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_auth_event(UUID, TEXT, TEXT, TEXT) TO service_role;
