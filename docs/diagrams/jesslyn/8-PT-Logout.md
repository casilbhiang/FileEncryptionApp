# User Story 8: Patient Logout

**As a patient, I want to log out safely and clear local session data so that unauthorized users cannot access the system.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│    Sidebar / TopBar         │  │        auth.py              │  │      LocalStorage           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displayLogoutButton()│  │ + logout()                  │  │ Stored items:               │
│                             │  │   : Response                │  │ - token                     │
│ - void clearLocalStorage()  │  │                             │  │ - user_id                   │
│                             │  │ + invalidate_session()      │  │ - role                      │
│ - void redirectToLogin()    │  │   : Boolean                 │  │ - encryptionKey             │
│                             │  │                             │  │                             │
│                             │  │ + log_logout_event()        │  │                             │
│                             │  │   : void                    │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
    Patient     :Sidebar/TopBar          :auth.py              :LocalStorage
      │
      │ Click "Logout"
      │────────────────────>│
      │                     │
      │                     │ logout(user_id)
      │                     │────────────────────────────>│
      │                     │                             │
      │                     │                   invalidate_session()
      │                     │                             │───────┐
      │                     │                             │       │
      │                     │                             │<──────┘
      │                     │                             │
      │                     │                   log_logout_event()
      │                     │                             │───────┐
      │                     │                             │       │
      │                     │                             │<──────┘
      │                     │                             │
      │                     │ return success              │
      │                     │<────────────────────────────│
      │                     │
      │                     │ clearLocalStorage()
      │                     │────────────────────────────────────────────>│
      │                     │                             │               │
      │                     │                             │               │───────┐
      │                     │                             │               │       │
      │                     │                             │               │<──────┘
      │                     │                             │               │
      │                     │ redirectToLogin()
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Navigate to login   │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/components/layout/Sidebar.tsx`, `TopBar.tsx`
- Controller: `backend/app/api/auth.py` - `logout()`
- Entity: Browser `localStorage`
