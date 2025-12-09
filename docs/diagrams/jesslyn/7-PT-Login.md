# User Story 7: Patient Login with OTP

**As a patient, I want to log in using my userID, password, and a one-time verification code sent to my email so that my login is fully secured.**

---

## BCE Class Diagram

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│      <<Boundary>>           │  │      <<Controller>>         │  │       <<Entity>>            │
│       LoginPage             │  │        auth.py              │  │       UserAccount           │
│    VerificationPage         │  │                             │  │       OTPStorage            │
├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
│                             │  │                             │  │                             │
│ LoginPage:                  │  │ + login()                   │  │ UserAccount:                │
│ - void displayLoginForm()   │  │   : Response                │  │ + user_id: String           │
│                             │  │                             │  │ + email: String             │
│ - void displayError         │  │ + verify_password()         │  │ + password_hash: String     │
│   (String message)          │  │   : Boolean                 │  │ + role: String              │
│                             │  │                             │  │                             │
│ VerificationPage:           │  │ + generate_otp()            │  │ OTPStorage:                 │
│ - void displayOTPForm()     │  │   : String                  │  │ + code: String              │
│                             │  │                             │  │ + expires_at: DateTime      │
│ - void displaySuccess()     │  │ + send_otp_email()          │  │                             │
│                             │  │   : Boolean                 │  │                             │
│ - void displayError         │  │                             │  │                             │
│   (String message)          │  │ + verify_code()             │  │                             │
│                             │  │   : Response                │  │                             │
│                             │  │                             │  │                             │
│                             │  │ + verify_otp()              │  │                             │
│                             │  │   : Boolean                 │  │                             │
│                             │  │                             │  │                             │
│                             │  │ + create_session()          │  │                             │
│                             │  │   : Token                   │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Sequence Diagram

```
    Patient     :LoginPage    :VerificationPage    :auth.py      :UserAccount    :OTPStorage
      │
      │ Open page
      │────────────────────>│
      │                     │
      │                     │ displayLoginForm()
      │                     │───────┐
      │                     │       │
      │                     │<──────┘
      │                     │
      │ View login form     │
      │<────────────────────│
      │                     │
      │ Enter credentials   │
      │────────────────────>│
      │                     │
      │                     │ login(role, userId, password)
      │                     │────────────────────────────────>│
      │                     │                                 │
      │                     │                   verify_password()
      │                     │                   ─────────────────────────>│
      │                     │                                 │           │
      │                     │  ┌────────[ALT: valid password]─────────┐  │
      │                     │  │              valid         │           │ │
      │                     │  │              <─────────────────────────│ │
      │                     │  │                            │           │ │
      │                     │  │              generate_otp()            │ │
      │                     │  │                            │───────┐   │ │
      │                     │  │                            │       │   │ │
      │                     │  │                            │<──────┘   │ │
      │                     │  │                            │           │ │
      │                     │  │              send_otp_email()          │ │
      │                     │  │                            │───────┐   │ │
      │                     │  │                            │       │   │ │
      │                     │  │                            │<──────┘   │ │
      │                     │  │                            │           │ │
      │                     │  │              store OTP                 │ │
      │                     │  │              ──────────────────────────────────────>│
      │                     │  │                            │           │            │
      │                     │  │ return {email, otp_sent}   │           │            │
      │                     │  │<────────────────────────────           │            │
      │                     │  │                                        │            │
      │                     │  │ navigate to verification               │            │
      │                     │  │────────────────────>│                  │            │
      │                     │  │                     │                  │            │
      │                     │  │                     │ displayOTPForm() │            │
      │                     │  │                     │───────┐          │            │
      │                     │  │                     │       │          │            │
      │                     │  │                     │<──────┘          │            │
      │                     │  └─────────────────────────────────────────────────────┘
      │                     │  ┌────────[ELSE: invalid password]────────┐
      │                     │  │              invalid   │           │
      │                     │  │              <─────────────────────│
      │                     │  │                        │           │
      │                     │  │ return error           │           │
      │                     │  │<────────────────────────           │
      │                     │  │                                    │
      │                     │  │ displayError("Invalid credentials")│
      │                     │  │───────┐                            │
      │                     │  │       │                            │
      │                     │  │<──────┘                            │
      │                     │  └────────────────────────────────────┘
      │                     │                                 │           │            │
      │ View OTP form       │                                 │           │            │
      │─────────────────────────────────────────>│            │           │            │
      │                                           │            │           │            │
      │ Enter OTP code                            │            │           │            │
      │───────────────────────────────────────────>│           │           │            │
      │                                           │            │           │            │
      │                                           │ verify_code(email, code)            │
      │                                           │────────────────────────────────>│   │
      │                                           │                                 │   │
      │                                           │  ┌────────[ALT: valid OTP]──────────────────┐
      │                                           │  │              verify_otp()   │   │        │
      │                                           │  │              ──────────────────────────────────────>│
      │                                           │  │                             │   │        │         │
      │                                           │  │              valid          │   │        │         │
      │                                           │  │              <──────────────────────────────────────│
      │                                           │  │                             │   │        │
      │                                           │  │              create_session()            │
      │                                           │  │                             │───────┐    │
      │                                           │  │                             │       │    │
      │                                           │  │                             │<──────┘    │
      │                                           │  │                             │   │        │
      │                                           │  │ return {token, user}        │   │        │
      │                                           │  │<────────────────────────────    │        │
      │                                           │  │                                 │        │
      │                                           │  │ displaySuccess()                │        │
      │                                           │  │ redirectToHome()                │        │
      │                                           │  │───────┐                         │        │
      │                                           │  │       │                         │        │
      │                                           │  │<──────┘                         │        │
      │                                           │  └──────────────────────────────────────────┘
      │                                           │  ┌────────[ELSE: invalid OTP]─────────┐
      │                                           │  │              verify_otp()   │   │        │
      │                                           │  │              ──────────────────────────────────────>│
      │                                           │  │                             │   │        │         │
      │                                           │  │              invalid        │   │        │         │
      │                                           │  │              <──────────────────────────────────────│
      │                                           │  │                             │   │        │
      │                                           │  │ return error                │   │        │
      │                                           │  │<────────────────────────────    │        │
      │                                           │  │                                 │        │
      │                                           │  │ displayError("Invalid OTP")     │        │
      │                                           │  │───────┐                         │        │
      │                                           │  │       │                         │        │
      │                                           │  │<──────┘                         │        │
      │                                           │  └─────────────────────────────────────────┘
      │                                           │                                 │   │        │
      │ Navigate to patient home                  │                                 │   │        │
      │<───────────────────────────────────────────│                                 │   │        │
      │
```

---

**Files:**
- Boundary: `frontend/src/pages/start/LoginPage.tsx`, `VerificationPage.tsx`
- Controller: `backend/app/api/auth.py` - `login()`, `verify_code()`
- Entity: `users` table, `otp_storage` (in-memory)
