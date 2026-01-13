# Quick Start: Patient Profiles Setup

## The Error You're Getting

```
ERROR: 23503: insert or update on table "patient_profiles" violates foreign key constraint
Key (user_id)=(585b31e1-c5b8-4089-959e-fbb195412deb) is not present in table "users"
```

### Why This Happens
The original script was trying to create a foreign key to `auth.users` (Supabase's built-in auth table), but your app uses a custom `public.users` table instead. The UUIDs don't match between these tables.

## ✅ Simple 2-Step Fix

### Step 1: Create the Table (Fixed Version)
Run this in Supabase SQL Editor:

📄 **File:** [create_patient_profiles_table_fixed.sql](create_patient_profiles_table_fixed.sql)

This version:
- ✅ Removes the foreign key constraint that was causing errors
- ✅ Uses `custom_user_id` for lookups (your compound IDs like JYPATPAT-67E)
- ✅ Still stores the UUID from your users table, just without strict FK constraint

### Step 2: Insert Sample Data
Run this in Supabase SQL Editor:

📄 **File:** [insert_existing_patient_profiles_fixed.sql](insert_existing_patient_profiles_fixed.sql)

This version:
- ✅ Looks up the UUID from `public.users` table using the compound user_id
- ✅ Has `ON CONFLICT` clause so you can run it multiple times safely
- ✅ Will update existing profiles if they already exist

## Verification

After running both scripts, verify it worked:

```sql
-- Should show 3 patient profiles
SELECT
    pp.custom_user_id,
    u.full_name,
    pp.age,
    pp.blood_type,
    pp.allergies
FROM public.patient_profiles pp
LEFT JOIN public.users u ON pp.custom_user_id = u.user_id
ORDER BY pp.custom_user_id;
```

Expected result: 3 rows showing JY Pat, WoMei You MingJI, and Jiayi with their health data.

## What If The Table Already Exists?

If you already tried creating the table with the old script, run this first:

```sql
DROP TABLE IF EXISTS public.patient_profiles CASCADE;
```

Then run the two scripts above.

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `create_patient_profiles_table_fixed.sql` | ✅ **USE THIS** - Creates table without FK issues | Fixed |
| `insert_existing_patient_profiles_fixed.sql` | ✅ **USE THIS** - Inserts data using proper lookups | Fixed |
| ~~`create_patient_profiles_table.sql`~~ | ❌ Old version with FK to auth.users | Don't use |
| ~~`insert_existing_patient_profiles.sql`~~ | ❌ Old version with FK issues | Don't use |
| `create_patient_profiles_table_simple.sql` | ✅ Alternative simple version | Use if needed |

## Testing After Setup

1. **Backend Test** - Create a new patient as admin:
   - Fill in all health profile fields
   - Click Create User
   - Check backend logs: should say "Patient profile created successfully"

2. **Frontend Test** - View patient as doctor:
   - Log in as doctor (e.g., Dr. Jessica Ong)
   - Go to View My Patients
   - Click on any patient (e.g., JY Pat)
   - Should see their real health data!

3. **Database Test**:
   ```sql
   -- Should return 3+ profiles (your original 3 + any new ones)
   SELECT COUNT(*) FROM patient_profiles;
   ```

## Common Issues

### "null value in column user_id violates not-null constraint"
**Fix:** The SELECT subquery didn't find a matching user. Check the user_id exists:
```sql
SELECT user_id, full_name FROM public.users WHERE role = 'patient';
```

### "relation patient_profiles does not exist"
**Fix:** You haven't run Step 1 yet. Run `create_patient_profiles_table_fixed.sql` first.

### "permission denied for table patient_profiles"
**Fix:** Make sure you're using the service role key in your backend `.env` file, not the anon key.

## Summary

1. ✅ Run `create_patient_profiles_table_fixed.sql`
2. ✅ Run `insert_existing_patient_profiles_fixed.sql`
3. ✅ Verify with the SELECT query above
4. ✅ Test in frontend by viewing patient profiles

That's it! The patient profile system should now work correctly. 🎉

## Need Help?

See [TROUBLESHOOTING_SQL.md](TROUBLESHOOTING_SQL.md) for detailed error solutions.
