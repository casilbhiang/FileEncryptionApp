# User Story 3: Doctor Reset Password

**As a doctor, I want to reset my temporary password upon first login so that I can create a secure, personalized password for my account.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│   ResetPasswordPage         │  │        auth.py              │  │       UserAccount           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displayResetForm()   │  │ + reset_password()          │  │ + user_id: String           │
│                             │  │   : Response                │  │ + password_hash: String     │
│ - void displaySuccess()     │  │                             │  │ + password_reset_required   │
│                             │  │ + verify_old_password()     │  │   : Boolean                 │
│ - void displayError         │  │   : Boolean                 │  │                             │
│   (String message)          │  │                             │  │                             │
│                             │  │ + hash_password(password)   │  │                             │
│                             │  │   : String                  │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
    Doctor      :ResetPasswordPage       :auth.py              :UserAccount
      │
      │ Open page
      │────────────────────>│
      │                     │
      │                     │ displayResetForm()
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ View reset form     │
      │<────────────────────│
      │                     │
      │ Enter old & new passwords
      │────────────────────>│
      │                     │
      │                     │ reset_password(userId, oldPwd, newPwd)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   verify_old_password()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │  ┌────────[ALT: valid password]──────────┐    │
      │                     │  │              valid          │             │ │
      │                     │  │              <────────────────────────────│ │
      │                     │  │                             │             │ │
      │                     │  │              hash_password(newPwd)        │ │
      │                     │  │                             │───────┐     │ │
      │                     │  │                             │       │     │ │
      │                     │  │                             │<──────┘     │ │
      │                     │  │                             │             │ │
      │                     │  │              update password in database  │ │
      │                     │  │              ────────────────────────────>│ │
      │                     │  │                             │             │ │
      │                     │  │                             │             │ │
      │                     │  │              success        │             │ │
      │                     │  │              <────────────────────────────│ │
      │                     │  │                             │             │ │
      │                     │  │ return success              │             │ │
      │                     │  │<─────────────────────────────             │ │
      │                     │  │                                           │ │
      │                     │  │ displaySuccess()                          │ │
      │                     │  │ redirectToHome()                          │ │
      │                     │  │───────┐                                   │ │
      │                     │  │       │                                   │ │
      │                     │  │<──────┘                                   │ │
      │                     │  └───────────────────────────────────────────┘ │
      │                     │  ┌────────[ELSE: invalid password]────────────┐│
      │                     │  │              invalid        │             ││
      │                     │  │              <────────────────────────────││
      │                     │  │                             │             ││
      │                     │  │ return error                │             ││
      │                     │  │<─────────────────────────────             ││
      │                     │  │                                           ││
      │                     │  │ displayError("Invalid old password")      ││
      │                     │  │───────┐                                   ││
      │                     │  │       │                                   ││
      │                     │  │<──────┘                                   ││
      │                     │  └───────────────────────────────────────────┘│
      │                     │                                  │             │
      │ Show result         │                                  │             │
      │<────────────────────│                                  │             │
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/start/ResetPasswordPage.tsx`
- Controller: `backend/app/api/auth.py` - `reset_password()`
- Entity: `users` table (Supabase)
