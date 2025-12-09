# User Story 2: View All Users List

**As a SysAdmin, I want to see a list of all users and their roles so that I can manage permissions.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│     AUserMgtPage            │  │        auth.py              │  │       UserAccount           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displayUserTable     │  │ + get_users()               │  │ + user_id: String           │
│   (List<User> users)        │  │   : List<User>              │  │ + full_name: String         │
│                             │  │                             │  │ + email: String             │
│ - void displayError         │  │                             │  │ + role: String              │
│   (String message)          │  │                             │  │ + is_active: Boolean        │
│                             │  │                             │  │ + last_login: DateTime      │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :AUserMgtPage            :auth.py              :UserAccount
      │
      │ Navigate to page
      │────────────────────>│
      │                     │
      │                     │ fetchUsers()
      │                     │ fetch GET /api/auth/users
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   get_users()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   return users   │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │                   calculate_inactive_days()
      │                     │                                  │───────┐
      │                     │                                  │       │
      │                     │                                  │<──────┘
      │                     │                                  │
      │                     │ return List<User>                │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ setUsers(data.users)
      │                     │ displayUserTable(users)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show users table    │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/AUserMgtPage.tsx` (Lines 41-61)
- Controller: `backend/app/api/auth.py` - `get_users()` (Lines 632-678)
- Entity: `users` table (Supabase)

**Note:** Backend returns ALL users. Filtering/sorting done CLIENT-SIDE (Lines 64-91).
