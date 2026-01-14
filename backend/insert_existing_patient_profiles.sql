-- Insert sample health profile data for existing patients
-- Run this AFTER creating the patient_profiles table

-- First, let's check what patients exist and their UUIDs
-- You'll need to get the actual UUIDs from your users table

-- Patient 1: JYPATPAT-67E (JY Pat)
-- Email: jycyu25@gmail.com
INSERT INTO public.patient_profiles (
    user_id,
    custom_user_id,
    age,
    sex,
    blood_type,
    height,
    weight,
    allergies,
    chronic_conditions,
    vaccinations
)
SELECT
    id,
    'JYPATPAT-67E',
    28,
    'F',
    'O+',
    '160cm',
    '55kg',
    ARRAY['Pollen', 'Dust mites'],
    ARRAY['Asthma'],
    '[{"name": "Covid-19", "year": 2021}, {"name": "Influenza", "year": 2024}]'::jsonb
FROM public.users
WHERE user_id = 'JYPATPAT-67E'
ON CONFLICT (user_id) DO NOTHING;

-- Patient 2: YMWOMEIPAT-55M (WoMei You MingJI)
-- Email: jeslynhokayan@gmail.com
INSERT INTO public.patient_profiles (
    user_id,
    custom_user_id,
    age,
    sex,
    blood_type,
    height,
    weight,
    allergies,
    chronic_conditions,
    vaccinations
)
SELECT
    id,
    'YMWOMEIPAT-55M',
    32,
    'F',
    'A+',
    '165cm',
    '58kg',
    ARRAY['Penicillin', 'Shellfish'],
    ARRAY['Hypertension'],
    '[{"name": "Covid-19", "year": 2020}, {"name": "Tetanus", "year": 2023}]'::jsonb
FROM public.users
WHERE user_id = 'YMWOMEIPAT-55M'
ON CONFLICT (user_id) DO NOTHING;

-- Patient 3: JIAPAT-67G (Jiayi)
-- Email: jiayichow2016@gmail.com
INSERT INTO public.patient_profiles (
    user_id,
    custom_user_id,
    age,
    sex,
    blood_type,
    height,
    weight,
    allergies,
    chronic_conditions,
    vaccinations
)
SELECT
    id,
    'JIAPAT-67G',
    35,
    'F',
    'B+',
    '158cm',
    '52kg',
    ARRAY['Nuts', 'Latex'],
    ARRAY['Diabetes (Type 2)', 'Migraine'],
    '[{"name": "Covid-19", "year": 2021}, {"name": "HPV", "year": 2022}, {"name": "Influenza", "year": 2024}]'::jsonb
FROM public.users
WHERE user_id = 'JIAPAT-67G'
ON CONFLICT (user_id) DO NOTHING;

-- Verify the inserts
SELECT
    pp.custom_user_id,
    u.full_name,
    u.email,
    pp.age,
    pp.sex,
    pp.blood_type,
    pp.height,
    pp.weight,
    pp.allergies,
    pp.chronic_conditions,
    pp.vaccinations
FROM public.patient_profiles pp
JOIN public.users u ON pp.user_id = u.id
ORDER BY pp.custom_user_id;

-- If you need to update existing profiles instead of inserting new ones, use this:
-- UPDATE public.patient_profiles
-- SET
--     age = 28,
--     sex = 'F',
--     blood_type = 'O+',
--     height = '160cm',
--     weight = '55kg',
--     allergies = ARRAY['Pollen', 'Dust mites'],
--     chronic_conditions = ARRAY['Asthma'],
--     vaccinations = '[{"name": "Covid-19", "year": 2021}, {"name": "Influenza", "year": 2024}]'::jsonb
-- WHERE custom_user_id = 'JYPATPAT-67E';
