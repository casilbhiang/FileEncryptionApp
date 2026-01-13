-- Insert sample health profile data for existing patients
-- FIXED VERSION: Uses custom_user_id directly without foreign key dependency
-- Run this AFTER creating the patient_profiles table

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
VALUES (
    (SELECT id FROM public.users WHERE user_id = 'JYPATPAT-67E' LIMIT 1),
    'JYPATPAT-67E',
    28,
    'F',
    'O+',
    '160cm',
    '55kg',
    ARRAY['Pollen', 'Dust mites'],
    ARRAY['Asthma'],
    '[{"name": "Covid-19", "year": 2021}, {"name": "Influenza", "year": 2024}]'::jsonb
)
ON CONFLICT (custom_user_id) DO UPDATE SET
    age = EXCLUDED.age,
    sex = EXCLUDED.sex,
    blood_type = EXCLUDED.blood_type,
    height = EXCLUDED.height,
    weight = EXCLUDED.weight,
    allergies = EXCLUDED.allergies,
    chronic_conditions = EXCLUDED.chronic_conditions,
    vaccinations = EXCLUDED.vaccinations;

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
VALUES (
    (SELECT id FROM public.users WHERE user_id = 'YMWOMEIPAT-55M' LIMIT 1),
    'YMWOMEIPAT-55M',
    32,
    'F',
    'A+',
    '165cm',
    '58kg',
    ARRAY['Penicillin', 'Shellfish'],
    ARRAY['Hypertension'],
    '[{"name": "Covid-19", "year": 2020}, {"name": "Tetanus", "year": 2023}]'::jsonb
)
ON CONFLICT (custom_user_id) DO UPDATE SET
    age = EXCLUDED.age,
    sex = EXCLUDED.sex,
    blood_type = EXCLUDED.blood_type,
    height = EXCLUDED.height,
    weight = EXCLUDED.weight,
    allergies = EXCLUDED.allergies,
    chronic_conditions = EXCLUDED.chronic_conditions,
    vaccinations = EXCLUDED.vaccinations;

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
VALUES (
    (SELECT id FROM public.users WHERE user_id = 'JIAPAT-67G' LIMIT 1),
    'JIAPAT-67G',
    35,
    'F',
    'B+',
    '158cm',
    '52kg',
    ARRAY['Nuts', 'Latex'],
    ARRAY['Diabetes (Type 2)', 'Migraine'],
    '[{"name": "Covid-19", "year": 2021}, {"name": "HPV", "year": 2022}, {"name": "Influenza", "year": 2024}]'::jsonb
)
ON CONFLICT (custom_user_id) DO UPDATE SET
    age = EXCLUDED.age,
    sex = EXCLUDED.sex,
    blood_type = EXCLUDED.blood_type,
    height = EXCLUDED.height,
    weight = EXCLUDED.weight,
    allergies = EXCLUDED.allergies,
    chronic_conditions = EXCLUDED.chronic_conditions,
    vaccinations = EXCLUDED.vaccinations;

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
LEFT JOIN public.users u ON pp.custom_user_id = u.user_id
ORDER BY pp.custom_user_id;

-- Count total profiles
SELECT COUNT(*) as total_patient_profiles FROM public.patient_profiles;

-- Show success message
SELECT 'Successfully inserted/updated ' || COUNT(*)::text || ' patient profiles!' as status
FROM public.patient_profiles;
