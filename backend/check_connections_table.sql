-- Check the actual columns in doctor_patient_connections table
-- Run this in Supabase SQL Editor to see what columns exist

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'doctor_patient_connections'
ORDER BY ordinal_position;

-- Also show sample data
SELECT * FROM public.doctor_patient_connections LIMIT 5;
