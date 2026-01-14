-- Safe migration script to update existing users with compound User IDs
-- This script handles foreign key constraints and triggers properly
-- Format: [INITIALS][ROLE_PREFIX]-[LAST3_NRIC]
-- Example: KYJHOPAT-67I

-- IMPORTANT: This script must be run as a single transaction
BEGIN;

-- STEP 1: First, add NRIC and date_of_birth to users (if not already added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nric VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- STEP 2: Update NRIC and DOB first (without changing user_id yet)
UPDATE users SET nric = 'T0434567I', date_of_birth = '2004-08-10' WHERE user_id = 'ADM001';
UPDATE users SET nric = 'T0234567A', date_of_birth = '2002-01-15' WHERE user_id = 'ADM002';
UPDATE users SET nric = 'T0234567H', date_of_birth = '2002-11-25' WHERE user_id = 'ADM003';
UPDATE users SET nric = 'T0034567C', date_of_birth = '2000-05-12' WHERE user_id = 'ADM004';
UPDATE users SET nric = 'T0134567F', date_of_birth = '2001-12-23' WHERE user_id = 'DOC003';
UPDATE users SET nric = 'T0334567D', date_of_birth = '2003-09-30' WHERE user_id = 'DOC004';
UPDATE users SET nric = 'T0134567B', date_of_birth = '2001-03-20' WHERE user_id = 'DOC005';
UPDATE users SET nric = 'T0436665G', date_of_birth = '1988-12-30' WHERE user_id = 'DOC006';
UPDATE users SET nric = 'T0434567G', date_of_birth = '2004-06-16' WHERE user_id = 'PAT003';
UPDATE users SET nric = 'T0234567E', date_of_birth = '2002-07-25' WHERE user_id = 'PAT004';

-- STEP 3: Disable user-defined triggers (not system triggers)
-- Disable the problematic biometric trigger temporarily
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Disable all user-defined triggers on biometric_challenges
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'biometric_challenges'::regclass
          AND tgisinternal = false  -- Only user-defined triggers, not system triggers
    LOOP
        EXECUTE format('ALTER TABLE biometric_challenges DISABLE TRIGGER %I', trigger_record.tgname);
        RAISE NOTICE 'Disabled trigger %', trigger_record.tgname;
    END LOOP;

    -- Disable all user-defined triggers on users table
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'users'::regclass
          AND tgisinternal = false
    LOOP
        EXECUTE format('ALTER TABLE users DISABLE TRIGGER %I', trigger_record.tgname);
        RAISE NOTICE 'Disabled trigger %', trigger_record.tgname;
    END LOOP;
END $$;

-- STEP 4: Drop foreign key constraints temporarily
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'user_id'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
            constraint_record.table_name,
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint % from %',
            constraint_record.constraint_name,
            constraint_record.table_name;
    END LOOP;
END $$;

-- STEP 5: Update all foreign key references in related tables

-- Update biometric_challenges table
UPDATE biometric_challenges SET user_id = 'JESHOADM-67I' WHERE user_id = 'ADM001';
UPDATE biometric_challenges SET user_id = 'FYPADM-67A' WHERE user_id = 'ADM002';
UPDATE biometric_challenges SET user_id = 'JYADMADM-67H' WHERE user_id = 'ADM003';
UPDATE biometric_challenges SET user_id = 'CJYADMADM-67C' WHERE user_id = 'ADM004';
UPDATE biometric_challenges SET user_id = 'JYDOC-67F' WHERE user_id = 'DOC003';
UPDATE biometric_challenges SET user_id = 'BCDOC-67D' WHERE user_id = 'DOC004';
UPDATE biometric_challenges SET user_id = 'JYDOCDOC-67B' WHERE user_id = 'DOC005';
UPDATE biometric_challenges SET user_id = 'JODOC-65G' WHERE user_id = 'DOC006';
UPDATE biometric_challenges SET user_id = 'JIAPAT-67G' WHERE user_id = 'PAT003';
UPDATE biometric_challenges SET user_id = 'JYPATPAT-67E' WHERE user_id = 'PAT004';

-- Update audit_logs table
UPDATE audit_logs SET user_id = 'JESHOADM-67I' WHERE user_id = 'ADM001';
UPDATE audit_logs SET user_id = 'FYPADM-67A' WHERE user_id = 'ADM002';
UPDATE audit_logs SET user_id = 'JYADMADM-67H' WHERE user_id = 'ADM003';
UPDATE audit_logs SET user_id = 'CJYADMADM-67C' WHERE user_id = 'ADM004';
UPDATE audit_logs SET user_id = 'JYDOC-67F' WHERE user_id = 'DOC003';
UPDATE audit_logs SET user_id = 'BCDOC-67D' WHERE user_id = 'DOC004';
UPDATE audit_logs SET user_id = 'JYDOCDOC-67B' WHERE user_id = 'DOC005';
UPDATE audit_logs SET user_id = 'JODOC-65G' WHERE user_id = 'DOC006';
UPDATE audit_logs SET user_id = 'JIAPAT-67G' WHERE user_id = 'PAT003';
UPDATE audit_logs SET user_id = 'JYPATPAT-67E' WHERE user_id = 'PAT004';

-- Note: encryption_keys table uses UUID for user_id (from Supabase Auth), not custom user_id
-- So we skip updating encryption_keys as it doesn't use our custom user_id format

-- Update encrypted_files table (owner_id only, no uploaded_by column exists)
UPDATE encrypted_files SET owner_id = 'JESHOADM-67I' WHERE owner_id = 'ADM001';
UPDATE encrypted_files SET owner_id = 'FYPADM-67A' WHERE owner_id = 'ADM002';
UPDATE encrypted_files SET owner_id = 'JYADMADM-67H' WHERE owner_id = 'ADM003';
UPDATE encrypted_files SET owner_id = 'CJYADMADM-67C' WHERE owner_id = 'ADM004';
UPDATE encrypted_files SET owner_id = 'JYDOC-67F' WHERE owner_id = 'DOC003';
UPDATE encrypted_files SET owner_id = 'BCDOC-67D' WHERE owner_id = 'DOC004';
UPDATE encrypted_files SET owner_id = 'JYDOCDOC-67B' WHERE owner_id = 'DOC005';
UPDATE encrypted_files SET owner_id = 'JODOC-65G' WHERE owner_id = 'DOC006';
UPDATE encrypted_files SET owner_id = 'JIAPAT-67G' WHERE owner_id = 'PAT003';
UPDATE encrypted_files SET owner_id = 'JYPATPAT-67E' WHERE owner_id = 'PAT004';

-- Update file_shares table (shared_by and shared_with)
UPDATE file_shares SET shared_by = 'JESHOADM-67I' WHERE shared_by = 'ADM001';
UPDATE file_shares SET shared_by = 'FYPADM-67A' WHERE shared_by = 'ADM002';
UPDATE file_shares SET shared_by = 'JYADMADM-67H' WHERE shared_by = 'ADM003';
UPDATE file_shares SET shared_by = 'CJYADMADM-67C' WHERE shared_by = 'ADM004';
UPDATE file_shares SET shared_by = 'JYDOC-67F' WHERE shared_by = 'DOC003';
UPDATE file_shares SET shared_by = 'BCDOC-67D' WHERE shared_by = 'DOC004';
UPDATE file_shares SET shared_by = 'JYDOCDOC-67B' WHERE shared_by = 'DOC005';
UPDATE file_shares SET shared_by = 'JODOC-65G' WHERE shared_by = 'DOC006';
UPDATE file_shares SET shared_by = 'JIAPAT-67G' WHERE shared_by = 'PAT003';
UPDATE file_shares SET shared_by = 'JYPATPAT-67E' WHERE shared_by = 'PAT004';

UPDATE file_shares SET shared_with = 'JESHOADM-67I' WHERE shared_with = 'ADM001';
UPDATE file_shares SET shared_with = 'FYPADM-67A' WHERE shared_with = 'ADM002';
UPDATE file_shares SET shared_with = 'JYADMADM-67H' WHERE shared_with = 'ADM003';
UPDATE file_shares SET shared_with = 'CJYADMADM-67C' WHERE shared_with = 'ADM004';
UPDATE file_shares SET shared_with = 'JYDOC-67F' WHERE shared_with = 'DOC003';
UPDATE file_shares SET shared_with = 'BCDOC-67D' WHERE shared_with = 'DOC004';
UPDATE file_shares SET shared_with = 'JYDOCDOC-67B' WHERE shared_with = 'DOC005';
UPDATE file_shares SET shared_with = 'JODOC-65G' WHERE shared_with = 'DOC006';
UPDATE file_shares SET shared_with = 'JIAPAT-67G' WHERE shared_with = 'PAT003';
UPDATE file_shares SET shared_with = 'JYPATPAT-67E' WHERE shared_with = 'PAT004';

-- Update doctor_patient_connections table (doctor_id and patient_id)
UPDATE doctor_patient_connections SET doctor_id = 'JYDOC-67F' WHERE doctor_id = 'DOC003';
UPDATE doctor_patient_connections SET doctor_id = 'BCDOC-67D' WHERE doctor_id = 'DOC004';
UPDATE doctor_patient_connections SET doctor_id = 'JYDOCDOC-67B' WHERE doctor_id = 'DOC005';
UPDATE doctor_patient_connections SET doctor_id = 'JODOC-65G' WHERE doctor_id = 'DOC006';

UPDATE doctor_patient_connections SET patient_id = 'JIAPAT-67G' WHERE patient_id = 'PAT003';
UPDATE doctor_patient_connections SET patient_id = 'JYPATPAT-67E' WHERE patient_id = 'PAT004';

-- STEP 6: Update users table with new compound User IDs
UPDATE users SET user_id = 'JESHOADM-67I', updated_at = NOW() WHERE user_id = 'ADM001';
UPDATE users SET user_id = 'FYPADM-67A', updated_at = NOW() WHERE user_id = 'ADM002';
UPDATE users SET user_id = 'JYADMADM-67H', updated_at = NOW() WHERE user_id = 'ADM003';
UPDATE users SET user_id = 'CJYADMADM-67C', updated_at = NOW() WHERE user_id = 'ADM004';
UPDATE users SET user_id = 'JYDOC-67F', updated_at = NOW() WHERE user_id = 'DOC003';
UPDATE users SET user_id = 'BCDOC-67D', updated_at = NOW() WHERE user_id = 'DOC004';
UPDATE users SET user_id = 'JYDOCDOC-67B', updated_at = NOW() WHERE user_id = 'DOC005';
UPDATE users SET user_id = 'JODOC-65G', updated_at = NOW() WHERE user_id = 'DOC006';
UPDATE users SET user_id = 'JIAPAT-67G', updated_at = NOW() WHERE user_id = 'PAT003';
UPDATE users SET user_id = 'JYPATPAT-67E', updated_at = NOW() WHERE user_id = 'PAT004';

-- STEP 7: Re-enable user-defined triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Re-enable all user-defined triggers on biometric_challenges
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'biometric_challenges'::regclass
          AND tgisinternal = false
    LOOP
        EXECUTE format('ALTER TABLE biometric_challenges ENABLE TRIGGER %I', trigger_record.tgname);
        RAISE NOTICE 'Enabled trigger %', trigger_record.tgname;
    END LOOP;

    -- Re-enable all user-defined triggers on users table
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'users'::regclass
          AND tgisinternal = false
    LOOP
        EXECUTE format('ALTER TABLE users ENABLE TRIGGER %I', trigger_record.tgname);
        RAISE NOTICE 'Enabled trigger %', trigger_record.tgname;
    END LOOP;
END $$;

-- STEP 8: Recreate foreign key constraints
ALTER TABLE biometric_challenges
    ADD CONSTRAINT biometric_challenges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Skip encryption_keys constraint (uses UUID, not custom user_id)

ALTER TABLE encrypted_files
    ADD CONSTRAINT encrypted_files_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Skip uploaded_by constraint (column doesn't exist in encrypted_files)

ALTER TABLE file_shares
    ADD CONSTRAINT file_shares_shared_by_fkey
    FOREIGN KEY (shared_by) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE file_shares
    ADD CONSTRAINT file_shares_shared_with_fkey
    FOREIGN KEY (shared_with) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE doctor_patient_connections
    ADD CONSTRAINT doctor_patient_connections_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE doctor_patient_connections
    ADD CONSTRAINT doctor_patient_connections_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- STEP 9: Verify all updates
SELECT user_id, full_name, email, nric, date_of_birth, role
FROM users
ORDER BY user_id;

COMMIT;
