# User Story 12: Search Cloud Files with Encryption Verification

**As a SysAdmin, I want to search for files by user or file type and verify their encryption so that I can ensure all files are securely encrypted.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│   ACloudStoragePage         │  │       files.py              │  │     EncryptedFile           │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ - void displaySearchBar()   │  │ + search_files(params)      │  │ + id: UUID                  │
│                             │  │   : List<File>              │  │ + owner_id: String          │
│ - void displayUserFilter()  │  │                             │  │ + original_filename: String │
│                             │  │ + filter_by_owner()         │  │ + mime_type: String         │
│ - void displayTypeFilter()  │  │   : List<File>              │  │ + file_size: Integer        │
│                             │  │                             │  │ + encryption_metadata: JSON │
│ - void displayResults       │  │ + filter_by_type()          │  │ + is_deleted: Boolean       │
│   (List<File> files)        │  │   : List<File>              │  │ + uploaded_at: DateTime     │
│                             │  │                             │  │                             │
│ - void verifyEncryption     │  │ + get_encryption_info()     │  │                             │
│   (File file)               │  │   : EncryptionInfo          │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
  SysAdmin      :ACloudStoragePage      :files.py             :EncryptedFile
      │
      │ Select user OR file type
      │────────────────────>│
      │                     │
      │                     │ search_files(owner_id, type)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   filter_by_owner()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   files          │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │                   filter_by_type()
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   filtered files │             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │ return List<File>                │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displayResults(files)
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show files with     │
      │ encryption info     │
      │<────────────────────│
      │
      │ Click "Verify Encryption"
      │────────────────────>│
      │                     │
      │                     │ get_encryption_info(file_id)
      │                     │─────────────────────────────────>│
      │                     │                                  │
      │                     │                   get encryption info
      │                     │                   ────────────────────────────>│
      │                     │                                  │             │
      │                     │                                  │             │
      │                     │                   encryption data│             │
      │                     │                   <────────────────────────────│
      │                     │                                  │
      │                     │ return EncryptionInfo            │
      │                     │<─────────────────────────────────│
      │                     │
      │                     │ displayEncryptionDetails()
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ Show: AES-GCM-256   │
      │ IV, Auth Tag        │
      │<────────────────────│
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/admin/ACloudStoragePage.tsx`
- Controller: `backend/app/api/files.py` - `search_files()`, `get_encryption_info()`
- Entity: `files` table (Supabase)
