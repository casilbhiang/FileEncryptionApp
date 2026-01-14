-- Create automatic audit logging for user creation using database triggers
-- This will automatically log whenever a new user is inserted into the users table

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION log_user_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit log entry when new user is created
    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        action,
        target,
        result,
        details,
        metadata,
        created_at
    )
    VALUES (
        NEW.created_at,                                                    -- Use the user's creation timestamp
        NEW.user_id,                                                       -- Compound user ID (e.g., JODOC-65G)
        'user_created',                                                    -- Action type
        NEW.email,                                                         -- Target is user's email
        'success',                                                         -- Result
        'User account created: ' || NEW.full_name || ' (' || NEW.role || ')',  -- Details
        jsonb_build_object(
            'user_id', NEW.user_id,
            'email', NEW.email,
            'full_name', NEW.full_name,
            'role', NEW.role,
            'created_by', 'system'
        ),                                                                 -- Metadata as JSONB
        NEW.created_at                                                     -- Created at timestamp
    );

    -- Log success message
    RAISE NOTICE 'Audit log created for new user: %', NEW.user_id;

    -- Return the new row to continue the INSERT
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_user_creation ON public.users;

-- Step 3: Create the trigger on the users table
CREATE TRIGGER trigger_log_user_creation
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_creation();

-- Step 4: Verify the trigger was created
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_name = 'trigger_log_user_creation';

-- Step 5: Test by checking existing structure
SELECT
    'Trigger created successfully!' as status,
    'New users will automatically generate audit logs' as message;
