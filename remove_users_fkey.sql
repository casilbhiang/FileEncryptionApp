-- Remove the foreign key constraint from users table
-- This constraint is causing the insert to fail

-- First, let's see what the constraint is
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE
        WHEN con.contype = 'f' THEN (
            SELECT nspname || '.' || relname
            FROM pg_class
            JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
            WHERE pg_class.oid = con.confrelid
        )
        ELSE NULL
    END AS foreign_table
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'users'
AND nsp.nspname = 'public'
AND con.contype = 'f';

-- Now drop the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Verify it's gone
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'users'
AND constraint_type = 'FOREIGN KEY';
