-- Update the event_type check constraint to include user_created and password_reset events

-- First, drop the existing check constraint
ALTER TABLE login_audit
DROP CONSTRAINT IF EXISTS login_audit_event_type_check;

-- Add the new constraint with additional event types
ALTER TABLE login_audit
ADD CONSTRAINT login_audit_event_type_check
CHECK (event_type IN (
    'login_success',
    'login_failed',
    'otp_sent',
    'otp_verified',
    'otp_failed',
    'logout',
    'password_reset',
    'user_created'
));
