# User Story 9: View Audit Logs

**As a SysAdmin, I want to view audit logs so that I can monitor who accessed/modified files and when.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│    AAuditLogsPage           │  │       audit.py              │  │       AuditLog              │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displayLogsTable     │  │ + get_logs()                │  │ + id: UUID                  │
│   (List<Log> logs)          │  │   : List<AuditLog>          │  │ + user_id: String           │
│                             │  │                             │  │ + event_type: String        │
│ - void displayFilters()     │  │                             │  │ + email: String             │
│                             │  │                             │  │ + result: String            │
│ - void displayError         │  │                             │  │ + metadata: JSON            │
│   (String message)          │  │                             │  │ + created_at: DateTime      │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :AAuditLogsPage         :audit.py             :AuditLog
      │
      │ Navigate to page
      │────────────────────>│
      │                     │
      │                     │ get_logs()
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   get all audit logs
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   return logs    │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │                   sort by date
      │                     │                                  │───────┐
      │                     │                                  │       │
      │                     │                                  │<──────┘
      │                     │                                  │
      │                     │ return List<AuditLog>            │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displayLogsTable(logs)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show audit logs     │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/AAuditLogsPage.tsx`
- Controller: `backend/app/api/audit.py` - `get_logs()`
- Entity: `login_audit` table (Supabase)
