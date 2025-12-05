-- Simple fix for users table id column
-- This adds UUID auto-generation to the id column

ALTER TABLE "user"
ALTER COLUMN id SET DEFAULT gen_random_uuid();
