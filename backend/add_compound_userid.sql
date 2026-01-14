-- Add compound User ID system
-- User ID format: [INITIALS][ROLE_PREFIX]-[LAST3_NRIC]
-- Example: KYJHOPAT-67I (Ka Yan Jeslyn Ho, Patient, NRIC ending in 67I)

-- This column will store the last 3 characters of NRIC for the compound ID
-- We don't need a new column since we can derive it from NRIC
-- Just update the user_id format

-- Run this in your Supabase SQL editor
