# BCE and Sequence Diagrams - Jesslyn Branch

This directory contains all BCE (Boundary-Control-Entity) diagrams and sequence diagrams for the File Encryption App, aligned with the implementation in the `jesslyn` branch.

## Diagrams Overview

### User Management (Stories 1-2)
1. **[1-SA-CreateUser.md](1-SA-CreateUser.md)** - SysAdmin creates new user accounts with auto-generated credentials
2. **[2-SA-ViewAllUsers.md](2-SA-ViewAllUsers.md)** - SysAdmin views list of all users and their roles

### Authentication - Doctor (Stories 3-5)
3. **[3-DR-ResetPassword.md](3-DR-ResetPassword.md)** - Doctor resets temporary password on first login
4. **[4-DR-Login.md](4-DR-Login.md)** - Doctor logs in with OTP verification
5. **[5-DR-Logout.md](5-DR-Logout.md)** - Doctor logs out and clears session data

### Authentication - Patient (Stories 6-8)
6. **[6-PT-ResetPassword.md](6-PT-ResetPassword.md)** - Patient resets temporary password on first login
7. **[7-PT-Login.md](7-PT-Login.md)** - Patient logs in with OTP verification
8. **[8-PT-Logout.md](8-PT-Logout.md)** - Patient logs out and clears session data

### Audit & Search (Stories 9-12)
9. **[9-SA-ViewAuditLogs.md](9-SA-ViewAuditLogs.md)** - SysAdmin views audit logs
10. **[10-SA-SearchUsers.md](10-SA-SearchUsers.md)** - SysAdmin searches for users by name, role, or ID
11. **[11-SA-SearchAuditLogs.md](11-SA-SearchAuditLogs.md)** - SysAdmin searches audit logs by date or filename
12. **[12-SA-SearchCloudFiles.md](12-SA-SearchCloudFiles.md)** - SysAdmin searches files and verifies encryption

## Naming Convention

- **SA** = SysAdmin user story
- **DR** = Doctor user story
- **PT** = Patient user story

## Architecture Notes

### Frontend Architecture
- **No Service Layer**: Pages directly call API endpoints using `fetch()`
- **Client-Side Operations**: Some filtering/sorting done in React components
- **Tech Stack**: React + TypeScript

### Backend Architecture
- **Controllers**: Flask routes in `backend/app/api/` (auth.py, files.py, audit.py)
- **No Separate Controller Classes**: Route functions act as controllers
- **Database**: Supabase PostgreSQL
- **Authentication**: OTP (One-Time Password) via email + SHA-256 password hashing

### BCE Pattern Implementation
- **Boundary**: React pages and components (`frontend/src/pages/`)
- **Controller**: Flask API routes (`backend/app/api/`)
- **Entity**: Database tables (Supabase) and in-memory storage (OTP)

## Key Implementation Details

### Password Management
- Auto-generated temporary passwords for new users
- SHA-256 hashing for password storage
- Password reset required flag for first-time login

### Authentication Flow
1. User enters credentials (userID, password, role)
2. Backend verifies password and generates OTP
3. OTP sent to user's email
4. User enters OTP code for verification
5. Session created with token stored in localStorage

### Search Functionality
- **User Search (#10)**: Backend filtering by name, role, ID
- **Audit Log Search (#11)**: Backend filtering by date range and metadata
- **File Search (#12)**: Backend filtering by owner and file type

### Session Management
- Token-based authentication
- localStorage used for client-side session storage
- Logout invalidates session and clears all local data

## Diagram Format

Each diagram file contains:
1. **User Story**: The requirement being addressed
2. **BCE Class Diagram**: Shows Boundary, Controller, and Entity components with their methods/attributes
3. **Sequence Diagram**: Shows the flow of interactions between components
4. **Files**: Lists the actual source files implementing each component

## Notes
- All diagrams are based on the actual implementation in the `jesslyn` branch
- No SQL code is shown in sequence diagrams (only simple descriptions like "save to database")
- Each controller method listed in BCE diagrams appears in the sequence diagram
