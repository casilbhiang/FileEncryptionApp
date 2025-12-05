-- Fix the users table to auto-generate UUID for id column
-- Run this in Supabase SQL Editor

ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change worked
SELECT column_name, column_default, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id';
