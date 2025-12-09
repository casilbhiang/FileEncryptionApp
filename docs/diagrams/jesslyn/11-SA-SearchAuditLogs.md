# User Story 11: Search Audit Logs

**As a SysAdmin, I want to search audit logs by date or file name so that I can investigate suspicious incidents.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│    AAuditLogsPage           │  │       audit.py              │  │       AuditLog              │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displaySearchBar()   │  │ + search_logs(params)       │  │ + id: UUID                  │
│                             │  │   : List<AuditLog>          │  │ + user_id: String           │
│ - void displayDateFilter()  │  │                             │  │ + event_type: String        │
│                             │  │ + filter_by_date_range()    │  │ + metadata: JSON            │
│ - void displayResults       │  │   : List<AuditLog>          │  │ + created_at: DateTime      │
│   (List<Log> logs)          │  │                             │  │                             │
│                             │  │ + filter_by_metadata()      │  │                             │
│                             │  │   : List<AuditLog>          │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :AAuditLogsPage         :audit.py             :AuditLog
      │
      │ Enter date range OR filename
      │────────────────────>│
      │                     │
      │                     │ search_logs(start_date, end_date, search)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   filter_by_date_range()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   logs           │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │                   filter_by_metadata()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   filtered logs  │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │ return List<AuditLog>            │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displayResults(logs)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show filtered logs  │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/AAuditLogsPage.tsx`
- Controller: `backend/app/api/audit.py` - `search_logs()`
- Entity: `login_audit` table (Supabase)
