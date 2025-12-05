-- Fix the log_auth_event function conflict
-- There are two functions with the same name but different signatures
-- We'll drop both and create one unified function that handles all cases

-- Drop the existing functions (both versions)
DROP FUNCTION IF EXISTS log_auth_event(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_auth_event(UUID, VARCHAR, INET, TEXT, VARCHAR, TEXT, JSONB);

-- Create a single unified function with all possible parameters
CREATE OR REPLACE FUNCTION log_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_email TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the authentication event into login_audit table
    -- Only insert columns that exist in your table
    INSERT INTO login_audit (user_id, event_type, email, error_message)
    VALUES (p_user_id, p_event_type, p_email, p_error_message);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_auth_event(UUID, TEXT, TEXT, TEXT, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_auth_event(UUID, TEXT, TEXT, TEXT, INET, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_auth_event(UUID, TEXT, TEXT, TEXT, INET, TEXT, JSONB) TO anon;
