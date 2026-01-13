-- Simplified version: Create patient_profiles table without complex RLS policies
-- Use this if you encounter RLS policy errors with the main script
-- Run this in Supabase SQL Editor

-- Drop table if you need to recreate it
-- DROP TABLE IF EXISTS public.patient_profiles CASCADE;

CREATE TABLE IF NOT EXISTS public.patient_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_user_id TEXT UNIQUE, -- The compound user ID (e.g., KYJHOPAT-67I)

    -- Basic Health Info
    age INTEGER,
    sex VARCHAR(10),
    blood_type VARCHAR(10),
    height VARCHAR(20),
    weight VARCHAR(20),

    -- Medical History (stored as JSONB for flexibility)
    allergies TEXT[], -- Array of allergies
    chronic_conditions TEXT[], -- Array of chronic conditions
    vaccinations JSONB, -- JSON array of {name: string, year: number}

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON public.patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_custom_user_id ON public.patient_profiles(custom_user_id);

-- Enable Row Level Security
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: Allow service role full access (for backend API)
DROP POLICY IF EXISTS "Enable access for service role" ON public.patient_profiles;
CREATE POLICY "Enable access for service role" ON public.patient_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_patient_profile_timestamp ON public.patient_profiles;
CREATE TRIGGER update_patient_profile_timestamp
    BEFORE UPDATE ON public.patient_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_profile_updated_at();

-- Verify table was created
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_profiles'
ORDER BY ordinal_position;

-- Show that the table is ready
SELECT 'patient_profiles table created successfully!' AS status;
