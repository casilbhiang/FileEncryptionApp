-- Fix audit logging function to properly log user_created and password_reset events
-- This function should be run in Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.log_simple_auth_event(uuid, text, text, text, jsonb);

-- Create or replace the log_simple_auth_event function
CREATE OR REPLACE FUNCTION public.log_simple_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_email TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id_text TEXT;
    v_action TEXT;
    v_target TEXT;
    v_result TEXT;
    v_details TEXT;
BEGIN
    -- Map event types to action names
    CASE p_event_type
        WHEN 'user_created' THEN
            v_action := 'User Created';
            v_result := 'OK';
            v_details := 'New user account created';
        WHEN 'password_reset' THEN
            v_action := 'Password Reset';
            v_result := 'OK';
            v_details := 'User password was reset';
        WHEN 'login_success' THEN
            v_action := 'Login Success';
            v_result := 'OK';
            v_details := 'User logged in successfully';
        WHEN 'login_failed' THEN
            v_action := 'Login Failed';
            v_result := 'FAILED';
            v_details := COALESCE(p_error_message, 'Login attempt failed');
        WHEN 'otp_sent' THEN
            v_action := 'Otp Sent';
            v_result := 'OK';
            v_details := 'OTP sent to user';
        WHEN 'logout' THEN
            v_action := 'Logout';
            v_result := 'OK';
            v_details := 'User logged out';
        ELSE
            v_action := p_event_type;
            v_result := 'OK';
            v_details := 'Event logged';
    END CASE;

    -- Get the custom user_id from users table if UUID is provided
    IF p_user_id IS NOT NULL THEN
        SELECT user_id INTO v_user_id_text
        FROM public.users
        WHERE id = p_user_id;

        -- If no custom user_id found, use the UUID
        IF v_user_id_text IS NULL THEN
            v_user_id_text := p_user_id::text;
        END IF;
    ELSE
        v_user_id_text := 'System';
    END IF;

    -- Set target (email or user_id)
    v_target := COALESCE(p_email, v_user_id_text);

    -- Insert into audit_logs
    INSERT INTO public.audit_logs (
        user_id,
        action,
        target,
        result,
        details,
        metadata,
        timestamp
    ) VALUES (
        v_user_id_text,
        v_action,
        v_target,
        v_result,
        v_details,
        p_metadata,
        timezone('utc'::text, now())
    );

    -- Log for debugging
    RAISE NOTICE 'Logged event: % for user: % with result: %', v_action, v_user_id_text, v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        RAISE NOTICE 'Error logging audit event: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.log_simple_auth_event(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_simple_auth_event(uuid, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_simple_auth_event(uuid, text, text, text, jsonb) TO anon;

-- Test the function with a sample user_created event (replace with actual user UUID)
-- SELECT log_simple_auth_event(
--     'your-user-uuid-here'::uuid,
--     'user_created',
--     'test@example.com',
--     NULL,
--     '{}'::jsonb
-- );

-- Verify the audit_logs table structure
-- SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;
