# Adding Health Profile Data for Existing Patients

## Overview
This guide explains how to add sample health profile data for the existing patients in your database.

## Current Patients in Database

Based on the screenshot, you have **3 existing patients**:

1. **JYPATPAT-67E** - JY Pat (jycyu25@gmail.com)
2. **YMWOMEIPAT-55M** - WoMei You MingJI (jeslynhokayan@gmail.com)
3. **JIAPAT-67G** - Jiayi (jiayichow2016@gmail.com)

## Setup Steps

### Step 1: Create the Patient Profiles Table
Run [create_patient_profiles_table.sql](create_patient_profiles_table.sql) in Supabase SQL Editor first.

**If you encounter any SQL errors**, see [TROUBLESHOOTING_SQL.md](TROUBLESHOOTING_SQL.md) or use the simplified version: [create_patient_profiles_table_simple.sql](create_patient_profiles_table_simple.sql)

### Step 2: Insert Sample Health Data
Run [insert_existing_patient_profiles.sql](insert_existing_patient_profiles.sql) to add health profile data for existing patients.

## Sample Data Included

### Patient 1: JYPATPAT-67E (JY Pat)
- **Age**: 28
- **Sex**: F
- **Blood Type**: O+
- **Height**: 160cm
- **Weight**: 55kg
- **Allergies**: Pollen, Dust mites
- **Chronic Conditions**: Asthma
- **Vaccinations**: Covid-19 (2021), Influenza (2024)

### Patient 2: YMWOMEIPAT-55M (WoMei You MingJI)
- **Age**: 32
- **Sex**: F
- **Blood Type**: A+
- **Height**: 165cm
- **Weight**: 58kg
- **Allergies**: Penicillin, Shellfish
- **Chronic Conditions**: Hypertension
- **Vaccinations**: Covid-19 (2020), Tetanus (2023)

### Patient 3: JIAPAT-67G (Jiayi)
- **Age**: 35
- **Sex**: F
- **Blood Type**: B+
- **Height**: 158cm
- **Weight**: 52kg
- **Allergies**: Nuts, Latex
- **Chronic Conditions**: Diabetes (Type 2), Migraine
- **Vaccinations**: Covid-19 (2021), HPV (2022), Influenza (2024)

## Verification

After running the insert script, verify the data with:

```sql
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
```

You should see 3 rows with all the health profile data.

## Testing the Frontend

After inserting the data:

1. Log in as a doctor (e.g., Dr. Jessica Ong - JODOC-65G)
2. Go to **View My Patients**
3. Click on any patient card (e.g., JY Pat)
4. You should now see their real health profile data instead of hardcoded values!

## Customizing the Data

If you want to modify the sample data, edit [insert_existing_patient_profiles.sql](insert_existing_patient_profiles.sql):

### Change Age, Sex, Blood Type, etc.
```sql
age = 28,
sex = 'F',
blood_type = 'O+',
```

### Change Allergies (PostgreSQL Array)
```sql
allergies = ARRAY['Pollen', 'Dust mites', 'Peanuts'],
```

### Change Chronic Conditions (PostgreSQL Array)
```sql
chronic_conditions = ARRAY['Asthma', 'Hypertension'],
```

### Change Vaccinations (JSONB Array)
```sql
vaccinations = '[
    {"name": "Covid-19", "year": 2021},
    {"name": "Influenza", "year": 2024},
    {"name": "Tetanus", "year": 2023}
]'::jsonb
```

## Troubleshooting

### Error: "violates foreign key constraint"
**Cause**: The user_id doesn't exist in the users table.

**Solution**: Check that the custom_user_id (e.g., 'JYPATPAT-67E') matches exactly what's in your users table. Run:
```sql
SELECT user_id, full_name, email, role
FROM users
WHERE role = 'patient';
```

### Error: "duplicate key value violates unique constraint"
**Cause**: You already inserted data for this patient.

**Solution**: Use UPDATE instead of INSERT, or delete existing profile first:
```sql
DELETE FROM patient_profiles WHERE custom_user_id = 'JYPATPAT-67E';
```

### No rows inserted, no errors
**Cause**: The WHERE clause didn't match any users.

**Solution**: Verify the custom_user_id exists:
```sql
SELECT id, user_id, full_name FROM users WHERE user_id = 'JYPATPAT-67E';
```

## Adding More Patients

To add health profiles for additional patients, copy one of the INSERT statements and modify:

```sql
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
    'YOUR-PATIENT-ID',  -- Change this
    30,                  -- Change age
    'M',                 -- Change sex
    'AB+',              -- Change blood type
    '175cm',            -- Change height
    '70kg',             -- Change weight
    ARRAY['Peanuts'],   -- Change allergies
    ARRAY['None'],      -- Change conditions
    '[{"name": "Covid-19", "year": 2021}]'::jsonb  -- Change vaccinations
FROM public.users
WHERE user_id = 'YOUR-PATIENT-ID'  -- Change this
ON CONFLICT (user_id) DO NOTHING;
```

## Summary

1. ✅ Run `create_patient_profiles_table.sql` to create the table
2. ✅ Run `insert_existing_patient_profiles.sql` to add sample data for 3 patients
3. ✅ Test in frontend by viewing patient profiles as a doctor
4. ✅ Customize the data as needed for your project

Now all existing patients will have health profile data that displays correctly in the doctor's patient profile view!
