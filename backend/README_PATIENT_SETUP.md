# Patient Profile System - Complete Setup Guide

## 🎯 Quick Start (Recommended)

**Having foreign key errors?** Follow this simple guide:

👉 **[QUICKSTART_PATIENT_PROFILES.md](QUICKSTART_PATIENT_PROFILES.md)** 👈

Just run 2 SQL files and you're done!

---

## 📚 Full Documentation

### Setup Files (Use These)
1. **[create_patient_profiles_table_fixed.sql](create_patient_profiles_table_fixed.sql)** - Creates the table ✅
2. **[insert_existing_patient_profiles_fixed.sql](insert_existing_patient_profiles_fixed.sql)** - Adds sample data for 3 patients ✅

### Reference Documentation
- **[PATIENT_PROFILE_FIX.md](../PATIENT_PROFILE_FIX.md)** - Complete system overview
- **[PATIENT_DATA_SETUP.md](PATIENT_DATA_SETUP.md)** - Detailed setup instructions
- **[TROUBLESHOOTING_SQL.md](TROUBLESHOOTING_SQL.md)** - Error solutions

### Alternative/Backup Files
- **[create_patient_profiles_table_simple.sql](create_patient_profiles_table_simple.sql)** - Minimal version
- **[create_patient_profiles_table.sql](create_patient_profiles_table.sql)** - Original with RLS policies

---

## 🚀 What This System Does

### For Admins
- Create patients with complete health profiles
- Fields: age, sex, blood type, height, weight, allergies, chronic conditions, vaccinations
- Data is automatically saved to database

### For Doctors
- View complete patient health profiles
- See all medical history and conditions
- Access only connected patients' data

### For Patients
- Health data stored securely in database
- Privacy protected by Row Level Security
- Data persists across sessions

---

## ✅ Implementation Checklist

- [ ] Run `create_patient_profiles_table_fixed.sql` in Supabase
- [ ] Run `insert_existing_patient_profiles_fixed.sql` in Supabase
- [ ] Verify: Check that 3 patient profiles exist
- [ ] Test: Create new patient as admin with health data
- [ ] Test: View patient profile as doctor
- [ ] Fix audit logging by running `fix_audit_logging.sql`

---

## 📊 Database Schema

```sql
patient_profiles
├── id (UUID, primary key)
├── user_id (UUID, from public.users)
├── custom_user_id (TEXT, compound ID like JYPATPAT-67E)
├── age (INTEGER)
├── sex (VARCHAR)
├── blood_type (VARCHAR)
├── height (VARCHAR)
├── weight (VARCHAR)
├── allergies (TEXT[])
├── chronic_conditions (TEXT[])
├── vaccinations (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

---

## 🔧 Backend Changes

### New API Endpoint
```
GET /api/auth/patients/:user_id/profile
```
Returns complete patient data including health profile.

### Updated Endpoint
```
POST /api/auth/create-user
```
Now accepts `health_profile` object for patients.

### Files Modified
- `backend/app/api/auth.py` - Added patient profile storage
- `frontend/src/pages/admin/ACreateUserPage.tsx` - Sends health data
- `frontend/src/pages/doctor/DViewHealthProfilePage.tsx` - Fetches real data

---

## 📝 Sample Data Format

### Allergies
```
Input: "Pollen, Nuts, Shellfish"
Stored: ["Pollen", "Nuts", "Shellfish"]
```

### Chronic Conditions
```
Input: "Diabetes (Type 2), Hypertension"
Stored: ["Diabetes (Type 2)", "Hypertension"]
```

### Vaccinations
```
Input: "Covid-19 2021, Flu 2024"
Stored: [
  {"name": "Covid-19", "year": 2021},
  {"name": "Flu", "year": 2024}
]
```

---

## 🐛 Common Errors

### Foreign Key Constraint Error
**Error:** `violates foreign key constraint "patient_profiles_user_id_fkey"`

**Solution:** Use the fixed SQL files:
- `create_patient_profiles_table_fixed.sql`
- `insert_existing_patient_profiles_fixed.sql`

### RLS Policy Error
**Error:** `column dpc.status does not exist`

**Solution:** Use `create_patient_profiles_table_fixed.sql` which has simplified policies.

### Table Already Exists
**Error:** `relation patient_profiles already exists`

**Solution:**
```sql
DROP TABLE IF EXISTS public.patient_profiles CASCADE;
-- Then run create script again
```

See [TROUBLESHOOTING_SQL.md](TROUBLESHOOTING_SQL.md) for more solutions.

---

## 🎓 How It Works

1. **Admin creates patient** → Frontend sends health_profile data
2. **Backend receives data** → Parses and stores in patient_profiles table
3. **Doctor views patient** → Frontend fetches from GET /patients/:id/profile
4. **Data displayed** → Shows real health information instead of hardcoded values

---

## 📞 Need Help?

1. Check [QUICKSTART_PATIENT_PROFILES.md](QUICKSTART_PATIENT_PROFILES.md) for quick setup
2. See [TROUBLESHOOTING_SQL.md](TROUBLESHOOTING_SQL.md) for error solutions
3. Read [PATIENT_PROFILE_FIX.md](../PATIENT_PROFILE_FIX.md) for system overview

---

## 🎉 Success!

After setup, you should be able to:
- ✅ Create patients with full health profiles
- ✅ View real patient data as a doctor
- ✅ See 3 sample patients with health information
- ✅ Test the complete system end-to-end

The patient profile system is now fully operational! 🚀
