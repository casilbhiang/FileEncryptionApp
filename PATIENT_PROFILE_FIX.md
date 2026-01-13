# Patient Profile Fix - Health Data Storage & Retrieval

## Problem
When creating a patient user, the health profile fields (age, sex, blood type, height, weight, allergies, chronic conditions, vaccinations) were being collected in the frontend but not stored in the database. The patient profile page was showing hardcoded data instead of real patient information.

## Solution Overview
I've implemented a complete patient health profile system:

1. ✅ Created `patient_profiles` database table
2. ✅ Updated backend to accept and store health profile data
3. ✅ Updated frontend user creation to send health profile data
4. ✅ Created API endpoint to retrieve patient profiles with health data
5. ✅ Updated patient profile page to fetch and display real data

---

## Step-by-Step Implementation

### 1. Create the Patient Profiles Table

**File:** [create_patient_profiles_table.sql](backend/create_patient_profiles_table.sql)

Run this SQL script in your Supabase SQL Editor:

```sql
-- Creates the patient_profiles table with:
-- - Basic health info: age, sex, blood_type, height, weight
-- - Medical history: allergies (array), chronic_conditions (array), vaccinations (JSONB)
-- - Links to users via UUID and custom_user_id
-- - Row Level Security policies for privacy
```

**Important**: You must run this SQL script first before testing the new features.

### 2. Backend Changes

**File:** [backend/app/api/auth.py](backend/app/api/auth.py)

#### Updated `create_user()` function (Lines 94-267)
Now accepts `health_profile` in request body and stores it in `patient_profiles` table:

```python
# Request body now includes:
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "role": "patient",
  "nric": "S1234567A",
  "date_of_birth": "1990-01-01",
  "health_profile": {  // NEW - optional, only for patients
    "age": "38",
    "sex": "M",
    "bloodType": "B+",
    "height": "175cm",
    "weight": "70kg",
    "allergies": "Pollen, Nuts",
    "chronicConditions": "Diabetes",
    "vaccinations": "Covid-19 2020, Flu 2024"
  }
}
```

**Parsing logic** (Lines 197-254):
- Converts age to integer
- Splits comma-separated allergies/conditions into arrays
- Parses vaccinations in format "Name Year" (e.g., "Covid-19 2020")
- Stores in `patient_profiles` table linked to user

#### New `get_patient_profile()` endpoint (Lines 871-940)
```
GET /api/auth/patients/:user_id/profile
```

Returns complete patient data including health profile:
```json
{
  "success": true,
  "patient": {
    "user_id": "KYJHOPAT-67I",
    "full_name": "Kyle John Hopkins",
    "email": "kyle@example.com",
    "health_profile": {
      "age": 38,
      "sex": "M",
      "blood_type": "B+",
      "height": "175cm",
      "weight": "70kg",
      "allergies": ["Pollen", "Nuts"],
      "chronic_conditions": ["Diabetes"],
      "vaccinations": [
        {"name": "Covid-19", "year": 2020},
        {"name": "Flu", "year": 2024}
      ]
    }
  }
}
```

### 3. Frontend Changes

#### A. User Creation Page ([ACreateUserPage.tsx](frontend/src/pages/admin/ACreateUserPage.tsx))

**Lines 86-89**: Now sends health profile data when creating patients:
```typescript
// Add health profile if creating a patient
if (selectedRole.toLowerCase() === 'patient') {
  requestBody.health_profile = healthProfile;
}
```

The health profile form fields (Lines 272-366) now actually save data to the database!

#### B. Patient Profile Page ([DViewHealthProfilePage.tsx](frontend/src/pages/doctor/DViewHealthProfilePage.tsx))

**Complete rewrite** to fetch real data:

- **Lines 23-35**: Uses `useParams()` to get patientId from URL
- **Lines 37-83**: `fetchPatientProfile()` fetches data from API
- **Lines 85-119**: Loading and error states
- **Lines 192-225**: Shows "None recorded" for empty fields instead of crashing

**URL format**: `/doctor/patient-profile/:patientId`

Example: `/doctor/patient-profile/KYJHOPAT-67I`

---

## Database Schema

### `patient_profiles` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users (Supabase UUID) |
| `custom_user_id` | TEXT | Compound user ID (e.g., KYJHOPAT-67I) |
| `age` | INTEGER | Patient age |
| `sex` | VARCHAR(10) | Sex/Gender |
| `blood_type` | VARCHAR(10) | Blood type (A+, B-, O+, etc.) |
| `height` | VARCHAR(20) | Height (e.g., "175cm") |
| `weight` | VARCHAR(20) | Weight (e.g., "70kg") |
| `allergies` | TEXT[] | Array of allergies |
| `chronic_conditions` | TEXT[] | Array of chronic conditions |
| `vaccinations` | JSONB | Array of {name, year} objects |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

---

## Usage Guide

### For Admin: Creating a Patient with Health Profile

1. Navigate to **Admin** → **User Management** → **Create New User**
2. Fill in basic info: Full Name, Email, NRIC, Date of Birth
3. Select Role: **Patient**
4. The **Health Profile** section appears (teal background)
5. Fill in health information:
   - Age, Sex, Blood Type, Height, Weight
   - Allergies (comma-separated, e.g., "Pollen, Nuts, Shellfish")
   - Chronic Conditions (comma-separated, e.g., "Diabetes, Hypertension")
   - Vaccinations (format: "Name Year", e.g., "Covid-19 2020, Flu 2024")
6. Click **Create User**
7. Health profile is automatically saved to database

### For Doctor: Viewing Patient Profile

1. Navigate to **Doctor** → **View My Patients**
2. Click on a patient card
3. The patient's health profile page loads with real data from database
4. If no health data exists, shows "N/A" or "None recorded"

---

## Testing Checklist

### ✅ Test 1: Create Patient with Health Data
1. Run the SQL script to create `patient_profiles` table
2. As admin, create a new patient with all health fields filled
3. Check database: `SELECT * FROM patient_profiles WHERE custom_user_id = 'YOUR-USER-ID';`
4. Verify data is stored correctly

### ✅ Test 2: View Patient Profile
1. As doctor, navigate to View My Patients
2. Click on the patient you just created
3. Verify all health data displays correctly
4. Check that allergies, conditions, and vaccinations are parsed properly

### ✅ Test 3: Create Patient WITHOUT Health Data
1. Create a patient but leave health profile fields empty
2. View the patient's profile page
3. Verify it shows "N/A" or "None recorded" instead of crashing

### ✅ Test 4: Create Non-Patient User
1. Create a doctor or admin user
2. Verify no health profile is created (only for patients)
3. No errors should occur

---

## Data Format Examples

### Allergies
**Input**: `Pollen, Nuts, Shellfish`
**Stored as**: `["Pollen", "Nuts", "Shellfish"]`
**Displayed as**: `Pollen, Nuts, Shellfish`

### Chronic Conditions
**Input**: `Diabetes (Type2), Hypertension`
**Stored as**: `["Diabetes (Type2)", "Hypertension"]`
**Displayed as**: `Diabetes (Type2), Hypertension`

### Vaccinations
**Input**: `Covid-19 2020, Flu 2024, Tetanus 2022`
**Stored as**:
```json
[
  {"name": "Covid-19", "year": 2020},
  {"name": "Flu", "year": 2024},
  {"name": "Tetanus", "year": 2022}
]
```
**Displayed as**:
```
Covid-19 - 2020
Flu - 2024
Tetanus - 2022
```

---

## Important Notes

1. **Health profiles are optional**: If admin doesn't fill in health data, the patient can still be created. The profile will show "N/A" or "None recorded".

2. **Only for patients**: Health profile data is only collected and stored for users with role = "patient". Doctors and admins don't have health profiles.

3. **Comma-separated format**: For arrays (allergies, conditions), use comma-separated values. The backend automatically splits them into proper arrays.

4. **Vaccination format**: Use format "Name Year" (e.g., "Covid-19 2020"). If year is missing, just the name is stored (e.g., "Tetanus").

5. **Privacy**: Row Level Security policies ensure:
   - Patients can only read their own profile
   - Doctors can only read profiles of connected patients
   - Admins (service role) have full access

---

## Troubleshooting

### Issue: "Failed to create patient profile"
**Solution**: Make sure you ran [create_patient_profiles_table.sql](backend/create_patient_profiles_table.sql) in Supabase SQL Editor first.

### Issue: Profile page shows "Patient not found"
**Solution**:
- Check that the patientId in URL matches actual user_id
- Ensure patient exists in users table
- Check browser console for API errors

### Issue: Health data not saving
**Solution**:
- Check backend logs for errors
- Verify `patient_profiles` table exists in Supabase
- Ensure RLS policies are set up correctly

### Issue: Vaccinations not parsing correctly
**Solution**: Use format "Name Year" with space between name and year. For example:
- ✅ "Covid-19 2020, Flu 2024"
- ❌ "Covid-19-2020, Flu-2024" (incorrect format)

---

## Summary

The patient profile system is now fully functional:

1. ✅ Health data is collected during patient creation
2. ✅ Data is stored in `patient_profiles` table
3. ✅ Patient profile page fetches and displays real data
4. ✅ Empty fields show "N/A" or "None recorded" gracefully
5. ✅ Privacy policies protect patient data

After running the SQL script, the system will automatically save and display patient health profiles!
