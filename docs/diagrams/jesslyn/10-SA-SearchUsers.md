# User Story 10: Search Users

**As a SysAdmin, I want to search for users by name, role, or ID so that I can manage their settings.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│     AUserMgtPage            │  │        auth.py              │  │       UserAccount           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displaySearchBar()   │  │ + search_users(params)      │  │ + user_id: String           │
│                             │  │   : List<User>              │  │ + full_name: String         │
│ - void displayResults       │  │                             │  │ + email: String             │
│   (List<User> users)        │  │ + filter_by_name()          │  │ + role: String              │
│                             │  │   : List<User>              │  │                             │
│                             │  │                             │  │                             │
│                             │  │ + filter_by_role()          │  │                             │
│                             │  │   : List<User>              │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :AUserMgtPage            :auth.py              :UserAccount
      │
      │ Enter search query
      │────────────────────>│
      │                     │
      │                     │ search_users(name, role, id)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   filter_by_name()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   users          │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │                   filter_by_role()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   filtered users │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │ return List<User>                │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displayResults(users)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show search results │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/AUserMgtPage.tsx`
- Controller: `backend/app/api/auth.py` - `search_users()`
- Entity: `users` table (Supabase)
