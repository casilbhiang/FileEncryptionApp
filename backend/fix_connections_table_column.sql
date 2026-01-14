-- Fix doctor_patient_connections table to add missing 'status' column
-- Run this in Supabase SQL Editor

-- First, check if the status column exists
DO $$
BEGIN
    -- Try to add the status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'doctor_patient_connections'
        AND column_name = 'status'
    ) THEN
        -- Add the status column
        ALTER TABLE public.doctor_patient_connections
        ADD COLUMN status VARCHAR(50) DEFAULT 'Active';

        RAISE NOTICE 'Added status column to doctor_patient_connections table';
    ELSE
        RAISE NOTICE 'Status column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'doctor_patient_connections'
ORDER BY ordinal_position;

-- Show current data
SELECT
    id,
    doctor_id,
    patient_id,
    status,
    created_at
FROM public.doctor_patient_connections;
