-- Update the log_simple_auth_event function with better error handling
-- This will help us see if RLS policies or other issues are preventing inserts

CREATE OR REPLACE FUNCTION log_simple_auth_event(
    p_user_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Try to insert the authentication event into login_audit table
    BEGIN
        INSERT INTO login_audit (user_id, event_type, email, error_message)
        VALUES (p_user_id, p_event_type, p_email, p_error_message);

        v_result := 'SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        v_result := 'ERROR: ' || SQLERRM;
    END;

    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_simple_auth_event(UUID, TEXT, TEXT, TEXT, JSONB) TO anon;
