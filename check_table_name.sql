-- Find the actual users table name in your database
-- Run this in Supabase SQL Editor to see what tables exist

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%user%'
ORDER BY table_name;
