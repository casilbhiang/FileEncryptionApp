# FileEncryptionApp - AI Agent Instructions

## Project Overview
**MediSecure** is a healthcare file encryption platform for Singapore clinics enabling secure medical record exchange between doctors and patients. All encryption happens client-side (AES-GCM) before upload, ensuring PDPA compliance and zero-knowledge architecture where even admins cannot access encrypted content.

## Architecture

### Frontend (React + TypeScript + Vite)
- **Location**: `/frontend`
- **Stack**: React 19, TypeScript, React Router 7, Tailwind CSS 4, Vite
- **Key entrypoint**: `src/App.tsx` defines route structure
- **Page organization**: 
  - Public pages: `pages/start/` (LoginPage, ResetPasswordPage, VerificationPage)
  - Role-based pages: `pages/{admin,doctor,patient}/` (mostly scaffolded)
  - Landing page: `pages/Homepage.tsx` (fully implemented with features & registration flow)

### Backend (Flask + Python)
- **Location**: `/backend`
- **Stack**: Flask 3.0, Flask-CORS, Flask-RESTful, Supabase (for auth/DB), cryptography library
- **Config**: Environment-based (`development`, `production`) via `.env`
- **External services**: Supabase URL/Key in config
- **Health check endpoint**: `GET /health` returns `{status: 'healthy'}`
- **API structure**: Blueprints pattern prepared in `app/api/__init__.py` (commented out)
- **Planned modules**: `app/crypto/`, `app/models/`, `app/utils/`

### Key Data Flow
1. **Authentication**: User logs in via LoginPage → Backend validates → JWT token returned
2. **File Encryption**: User uploads file → Client encrypts with AES-GCM → Backend stores encrypted blob
3. **Key Management**: RSA key pairs for user identity, AES keys stored locally/securely
4. **Sharing**: Users share encrypted files via secure link generation with key rotation support

## Development Workflow

### Frontend
```bash
cd frontend
npm install
npm run dev          # Vite dev server with HMR
npm run build        # TypeScript build + Vite bundle
npm run lint         # ESLint check
```

### Backend
```bash
cd backend
pip install -r requirements.txt
pytest -v tests/    # CI runs this command
# Run locally (no run.py/wsgi.py implementation yet)
```

### CI/CD
- **GitHub Actions** (`.github/workflows/ci.yml`):
  - **Backend**: Runs pytest on push/PR to main/dev
  - **Frontend**: Builds with `tsc -b && vite build` on push/PR to main/dev

## Code Patterns & Conventions

### Frontend Components
- **Location**: `src/components/` organized by purpose
  - `common/`: Reusable UI (Button, Card, Input, Modal)
  - `dialogs/`: Modal dialogs for actions (GenerateKeyPairDialog, ShareFileDialog, etc.)
  - `layout/`: App shell (DashboardLayout, Sidebar, TopBar)
- **Files mostly scaffolded**: Most component files exist but are empty—implement as needed
- **React Router**: Routes in App.tsx, currently only public routes active (role-based pages commented out)

### Services Layer
- **Location**: `src/services/` (currently scaffolded, empty)
- **Expected modules**:
  - `Api.ts`: Axios instance for backend communication (with auth token injection)
  - `Auth.ts`: Login/logout/session management
  - `Encryption.ts`: Client-side AES-GCM + RSA operations
  - `Files.ts`: Upload/download/share operations
  - `Keys.ts`: Key pair generation and management
  - `Users.ts`: User profile and settings

### State Management
- **Location**: `src/store/` (currently scaffolded, empty)
- **Modules**: `AuthStore.ts` (user session), `FileStore.ts` (uploaded files)
- **Pattern**: Simple module exports (no Redux/Zustand currently required)

### Type System
- **Location**: `src/types/Index.ts` (centralized types)
- **Key interfaces to define**:
  - `User` (id, role, email, keys)
  - `EncryptedFile` (id, name, encryptedData, keyId, sharedWith)
  - `KeyPair` (publicKey, privateKey, createdAt)

### Styling
- **Tailwind CSS 4** with PostCSS
- **Icons**: lucide-react (used in Homepage for feature showcasing)
- **Color scheme**: Blues, purples, teals (see Homepage.tsx for examples)
- **Responsive**: Mobile-first (Homepage shows pattern: `sm:`, `md:`, `lg:` breakpoints)

## Role-Based Access Patterns

### Three User Roles
1. **Patient**: Upload medical records, view shared docs from doctors, manage QR code pairing
2. **Doctor**: View patient records, upload health profiles, initiate file sharing
3. **Admin**: Manage users, audit logs, cloud storage configs, key management interface

### Expected Page Structure
- Admin pages: `pages/admin/A*.tsx` (Dashboard, UserMgt, KeyMgt, AuditLogs, CloudStorage)
- Doctor pages: `pages/doctor/D*.tsx` (Dashboard, MyFiles, ShareFiles, UploadFile, ViewPatient)
- Patient pages: `pages/patient/P*.tsx` (Dashboard, MyFiles, ShareFiles, UploadFile, ViewHealthProfile)

## Key External Dependencies

- **Supabase**: Authentication backend + database (URL/Key via `.env`)
- **Cryptography**: Python library for server-side crypto operations
- **axios**: HTTP client for frontend API calls
- **react-router-dom v7**: Navigation without auth-protected route wrapper yet

## Important Conventions

1. **Encryption First**: Every file operation assumes client-side encryption; backend never sees plaintext
2. **Zero-Knowledge**: Server stores encrypted blobs only; key material never transmitted to backend
3. **QR Code Flow**: Registration involves QR code + PIN exchange for secure key pairing (see Homepage step 5)
4. **Audit Logging**: All user actions logged server-side with timestamps (admin audit page planned)
5. **Environment Config**: All secrets in `.env`, never hardcoded; backend loads via `python-dotenv`

## Common Development Tasks

- **Adding a new page**: Create component in `pages/{role}/`, add route in App.tsx
- **Adding API endpoint**: Create route handler in `app/api/` (use Flask blueprints pattern)
- **Client-server integration**: Use axios from `services/Api.ts` with auth token injection
- **Testing encryption**: Use `cryptography` library for Python; browser Web Crypto API for TypeScript
- **Dialog/Modal**: Use Modal.tsx wrapper component from `components/common/`

## When Stuck

1. **Frontend routing**: Check App.tsx route definitions and page imports
2. **Backend setup**: Check `.env.example` and `config.py` for required env vars
3. **Build failures**: Run `npm run lint` (frontend) or `pytest` (backend) locally first
4. **Encryption issues**: Review Homepage.tsx feature descriptions for use-case context
