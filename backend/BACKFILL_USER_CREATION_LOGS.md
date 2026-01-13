# Backfill User Creation Audit Logs

## What This Does

This script adds "User Created" audit log entries for all existing users in your system based on their `created_at` timestamp from the `users` table.

## Why You Need This

Your backend already logs new user creations (in `auth.py` lines 184-195), but the 12 existing users were created before the audit logging system was properly set up. This script backfills those missing audit logs.

## Existing Users to Backfill

Based on your users data, these 12 users will get audit logs:

1. **JODOC-65G** - Dr. Jessica Ong (created: 2026-01-12 07:27:28)
2. **FYPADM-67A** - final year project (created: 2025-12-05 13:37:27)
3. **JYDOCDOC-67B** - JY Doc (created: 2025-12-15 13:26:32)
4. **CJYADMADM-67C** - CJY Admin (created: 2026-01-07 15:28:47)
5. **BCDOC-67D** - Basil C (created: 2025-12-06 19:25:03)
6. **XFCGONGPAT-66G** - Gong XI Fa Cai (created: 2026-01-13 10:24:04)
7. **JYPATPAT-67E** - JY Pat (created: 2025-12-15 13:38:09)
8. **YMWOMEIPAT-55M** - WoMei You MingJI (created: 2026-01-12 08:24:39)
9. **JYDOC-67F** - JY (created: 2025-12-09 17:14:32)
10. **JIAPAT-67G** - Jiayi (created: 2025-12-09 17:13:44)
11. **JYADMADM-67H** - JY Admin (created: 2025-12-14 16:37:44)
12. **JESHOADM-67I** - Jeslyn Ho (created: 2025-12-03 10:55:47)

## How to Use

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: [add_user_creation_audit_logs.sql](add_user_creation_audit_logs.sql)
3. Click **Run**

### Step 2: Verify Results

The script will show you:
- All newly created audit log entries
- Total count of user creation logs
- Earliest and latest creation dates

Expected output:
```
total_user_creation_logs: 12
earliest_creation: 2025-12-03 10:55:47+00
latest_creation: 2026-01-13 10:24:04+00
```

### Step 3: Check Audit Logs Page

1. Log in as **Admin**
2. Go to **Audit Logs** page
3. Filter by action: **"User Created"** (if filter exists) or search for "created"
4. You should see all 12 user creation events with their original creation timestamps

## What Gets Logged

Each audit log entry contains:
- **Timestamp**: Original user creation time (from `users.created_at`)
- **User ID**: The compound user ID (e.g., JODOC-65G)
- **Action**: `user_created`
- **Target**: User's email address
- **Result**: `success`
- **Details**: "User account created: [Full Name] ([role])"
- **Metadata**: JSON object with user details

## Safety Features

The script includes a `NOT EXISTS` check to prevent duplicate entries. You can run it multiple times safely - it will only insert audit logs that don't already exist.

## Future User Creations

Going forward, all new users created through the admin panel will automatically get audit log entries because the backend already has this functionality (see `backend/app/api/auth.py` lines 184-195).

---

## Troubleshooting

### No logs inserted?

Check if logs already exist:
```sql
SELECT COUNT(*) FROM audit_logs WHERE action = 'user_created';
```

If count > 0, the logs may already exist.

### Wrong timestamps?

Verify users table has correct `created_at` values:
```sql
SELECT user_id, full_name, created_at
FROM users
ORDER BY created_at;
```

---

## Summary

✅ **Backfills missing user creation audit logs**
✅ **Uses original creation timestamps from users table**
✅ **Safe to run multiple times (prevents duplicates)**
✅ **All new users will be logged automatically**
