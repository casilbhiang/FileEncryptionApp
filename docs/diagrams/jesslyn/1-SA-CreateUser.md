# User Story 1: Create New User Account

**As a SysAdmin, I want to create user accounts with auto-generated userID and temporary password so that I can onboard new users efficiently.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│    ACreateUserPage          │  │        auth.py              │  │       UserAccount           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displayUserForm      │  │ + create_user()             │  │ + user_id: String           │
│   (form fields)             │  │   : Response                │  │ + full_name: String         │
│                             │  │                             │  │ + email: String             │
│ - void displaySuccess       │  │ + generate_user_id(role)    │  │ + password_hash: String     │
│   (userId, password)        │  │   : String                  │  │ + role: String              │
│                             │  │                             │  │ + password_reset_required   │
│ - void displayError         │  │ + generate_password()       │  │   : Boolean                 │
│   (String message)          │  │   : String                  │  │                             │
│                             │  │                             │  │                             │
│                             │  │ + hash_password(password)   │  │                             │
│                             │  │   : String                  │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :ACreateUserPage         :auth.py              :UserAccount
      │
      │ Fill form & submit
      │────────────────────>│
      │                     │
      │                     │ create_user(full_name, email, role)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   generate_user_id(role)
      │                     │                                  │───────┐
      │                     │                                  │       │
      │                     │                                  │<──────┘
      │                     │                                  │
      │                     │                   generate_password()
      │                     │                                  │───────┐
      │                     │                                  │       │
      │                     │                                  │<──────┘
      │                     │                                  │
      │                     │                   hash_password(password)
      │                     │                                  │───────┐
      │                     │                                  │       │
      │                     │                                  │<──────┘
      │                     │                                  │
      │                     │                   save to database
      │                     │                   ─────────────────────────────>│
      │                     │                                  │              │
      │                     │                                  │              │
      │                     │                   success         │              │
      │                     │                   <─────────────────────────────│
      │                     │                                  │
      │                     │ return user_id, temp_password    │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displaySuccess(userId, password)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show credentials    │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/ACreateUserPage.tsx` (Lines 45-118)
- Controller: `backend/app/api/auth.py` - `create_user()` (Lines 52-150)
- Entity: `users` table (Supabase)
