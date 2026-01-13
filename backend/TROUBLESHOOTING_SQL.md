# SQL Setup Troubleshooting Guide

## Error: "column dpc.status does not exist"

**Error Message:**
```
ERROR: 42703: column dpc.status does not exist
```

### Cause
This error occurs when creating Row Level Security (RLS) policies that reference columns in related tables. The policy is trying to check the `status` column in the `doctor_patient_connections` table.

### Solution

**Option 1: Use the Fixed Script (Recommended)**
I've updated [create_patient_profiles_table.sql](create_patient_profiles_table.sql) to fix the column reference issue. The RLS policy now properly references the table columns.

Run this in Supabase SQL Editor - it should work now!

**Option 2: Use the Simple Script**
If you still encounter RLS policy errors, use [create_patient_profiles_table_simple.sql](create_patient_profiles_table_simple.sql) instead.

This version:
- ✅ Only has a simple service role policy (no complex joins)
- ✅ Your backend will have full access through the service role
- ✅ Still secure because it uses the service role key

### Steps to Fix

#### If the table was partially created:

1. **Drop the existing table** (if it exists with errors):
```sql
DROP TABLE IF EXISTS public.patient_profiles CASCADE;
```

2. **Run one of these scripts:**
   - `create_patient_profiles_table.sql` (updated version with fix)
   - OR `create_patient_profiles_table_simple.sql` (simplified version)

3. **Then run the insert script:**
   - `insert_existing_patient_profiles.sql`

#### If starting fresh:

Just run in this order:
1. `create_patient_profiles_table.sql` (or the simple version)
2. `insert_existing_patient_profiles.sql`

## Other Common Errors

### Error: "relation patient_profiles already exists"

**Cause:** Table already exists from a previous attempt.

**Solution:** Drop and recreate:
```sql
DROP TABLE IF EXISTS public.patient_profiles CASCADE;
-- Then run the create script again
```

### Error: "violates foreign key constraint"

**Cause:** Trying to insert a patient profile for a user_id that doesn't exist.

**Solution:** Check that the patient exists:
```sql
SELECT user_id, full_name, email, role
FROM public.users
WHERE role = 'patient';
```

Make sure the `user_id` values in the insert script match what you see in the query above.

### Error: "duplicate key value violates unique constraint"

**Cause:** You already inserted data for this patient.

**Solution:** Either skip the duplicate or update instead:
```sql
-- Option 1: Delete the old one first
DELETE FROM patient_profiles WHERE custom_user_id = 'JYPATPAT-67E';
-- Then run insert again

-- Option 2: Use UPDATE instead of INSERT
UPDATE public.patient_profiles
SET
    age = 28,
    sex = 'F',
    blood_type = 'O+',
    -- ... etc
WHERE custom_user_id = 'JYPATPAT-67E';
```

### Error: "malformed array literal"

**Cause:** Incorrect array syntax in the INSERT statement.

**Solution:** Arrays must use this format:
```sql
-- Correct
ARRAY['Value1', 'Value2', 'Value3']

-- Wrong
['Value1', 'Value2']
```

### Error: "invalid input syntax for type json"

**Cause:** Incorrect JSONB format for vaccinations.

**Solution:** Use proper JSON format with `::jsonb` cast:
```sql
-- Correct
'[{"name": "Covid-19", "year": 2021}]'::jsonb

-- Wrong
'[{name: "Covid-19", year: 2021}]'
```

## Verification Queries

After running the scripts, verify everything worked:

### Check table exists:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'patient_profiles';
```

### Check table structure:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_profiles'
ORDER BY ordinal_position;
```

### Check data was inserted:
```sql
SELECT
    custom_user_id,
    age,
    sex,
    blood_type,
    allergies,
    chronic_conditions
FROM public.patient_profiles;
```

### Check with user details:
```sql
SELECT
    pp.custom_user_id,
    u.full_name,
    u.email,
    pp.age,
    pp.blood_type,
    pp.allergies
FROM public.patient_profiles pp
JOIN public.users u ON pp.user_id = u.id;
```

Should return 3 rows (the 3 patients).

## Quick Reference

| Script | Purpose | Use When |
|--------|---------|----------|
| `create_patient_profiles_table.sql` | Main script with RLS policies | First try (now fixed) |
| `create_patient_profiles_table_simple.sql` | Simple version, service role only | If RLS errors persist |
| `insert_existing_patient_profiles.sql` | Add data for 3 existing patients | After table is created |

## Still Having Issues?

1. **Check Supabase logs** for detailed error messages
2. **Verify auth.users table exists** - this is created automatically by Supabase
3. **Check you're using service role key** in backend (not anon key)
4. **Run queries one at a time** in SQL Editor to identify which line causes errors

## Success Checklist

- ✅ Table `patient_profiles` created
- ✅ Indexes created
- ✅ RLS enabled with policies
- ✅ Trigger for `updated_at` created
- ✅ 3 patient profiles inserted
- ✅ Verification query returns 3 rows
- ✅ Frontend can fetch patient profiles

Once all checkboxes are checked, the system is ready to use!
