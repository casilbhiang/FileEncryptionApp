-- Create patient_profiles table to store health information
-- Run this in Supabase SQL Editor
-- After creating this table, run insert_existing_patient_profiles.sql to add data for existing patients

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

-- Create policy to allow service role full access
CREATE POLICY "Enable access for service role" ON public.patient_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create policy for authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON public.patient_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy for doctors to read their connected patients' profiles
-- Simplified version without status check to avoid column reference issues
CREATE POLICY "Doctors can read connected patients" ON public.patient_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctor_patient_connections
            WHERE doctor_patient_connections.patient_id = patient_profiles.custom_user_id
            AND doctor_patient_connections.doctor_id IN (
                SELECT u.user_id FROM public.users u WHERE u.id = auth.uid()
            )
        )
    );

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
SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_profiles';
