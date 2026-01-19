# Design Specification: User Stories & Diagrams

## 1. User Stories & Function Mapping

We have mapped your user stories to specific functions in the codebase.
**Recommendation**: 
- Combine **[DR] #2** and **[PT] #2** into a single "Establish Connection" story.
- Combine **[DR] #17** and **[PT] #14** into a single "Secure Decryption" story.

| User Story | ID | Primary Goal | Backend Function (`backend/`) | Frontend/Service (`frontend/`) |
| :--- | :--- | :--- | :--- | :--- |
| **SysAdmin** | [SA] #2 | Generate Key Pair | `keys.generate_key_pair()` | `keyService.generateKeyPair()` |
| **Doctor** | [DR] #2 | Connect via QR | `keys.scan_qr_code()` | `keyService.scanQRCode()` |
| **Patient** | [PT] #2 | Connect via QR | `keys.scan_qr_code()` | `keyService.scanQRCode()` |
| **Doctor** | [DR] #17 | Decryption Failure Notification | N/A (Client-side fail) | `Encryption.decryptFile()` (catches error) |
| **Patient** | [PT] #14 | Decryption Failure Notification | N/A (Client-side fail) | `Encryption.decryptFile()` (catches error) |

---

## 2. Use Case Diagram

This diagram shows the high-level interactions between actors and the system.

```mermaid
usecaseDiagram
    actor "SysAdmin" as SA
    actor "Doctor" as DR
    actor "Patient" as PT

    package "File Encryption App" {
        usecase "Generate Encryption Key Pair" as UC1
        usecase "View Connection QR" as UC2
        usecase "Scan QR to Connect" as UC3
        usecase "Encrypt & Upload File" as UC4
        usecase "Download & Decrypt File" as UC5
    }

    SA --> UC1
    SA --> UC2
    
    DR --> UC3
    DR --> UC4
    DR --> UC5

    PT --> UC3
    PT --> UC4
    PT --> UC5

    UC3 ..> UC2 : includes
```

---

## 3. BCE (Boundary-Control-Entity) Sequence Diagrams

### Sequence 1: Generate Key Pair ([SA] #2)
**Goal:** Create a secure communication channel (Key Pair) between Doctor and Patient.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as SysAdmin
    participant UI as KeyMgtPage (Boundary)
    participant API as keys.py (Control)
    participant Crypto as EncryptionManager (Control)
    participant DB as KeyPairStore (Entity)

    Admin->>UI: Click "Generate Key Pair"
    UI->>API: POST /api/keys/generate
    
    rect rgb(240, 248, 255)
        note right of API: Backend Logic
        API->>Crypto: generate_key()
        Crypto-->>API: Returns Random AES Key (DEK)
        API->>Crypto: encrypt_dek(DEK, MasterKey)
        Crypto-->>API: Returns Encrypted Blob
    end
    
    API->>DB: create(KeyPair with Encrypted Blob)
    DB-->>API: Success
    
    API->>Crypto: Generate QR Code (with DEK)
    Crypto-->>API: QR Code Image
    
    API-->>UI: Return Success + QR Code
    UI-->>Admin: Show Success Dialog & QR
```

### Sequence 2: Establish Connection / Scan QR ([DR] #2, [PT] #2)
**Goal:** Securely transfer the encryption key to the user's device via QR code.

```mermaid
sequenceDiagram
    autonumber
    actor User as Doctor/Patient
    participant UI as ScanQRDialog (Boundary)
    participant API as keys.py (Control)
    participant DB as KeyPairStore (Entity)
    participant ClientCrypto as Encryption.ts (Control)
    participant Local as LocalStorage (Entity)

    User->>UI: Scans QR Code
    UI->>API: POST /api/keys/scan (QR Data)
    
    API->>DB: get(key_id)
    DB-->>API: Returns KeyPair (Encrypted)
    
    alt KeyPair Valid
        API->>API: decrypt_dek(EncryptedBlob)
        API-->>UI: Return Decrypted Key (Base64)
        
        rect rgb(240, 255, 240)
            note right of UI: Client-Side Storage
            UI->>ClientCrypto: importKeyFromQRCode(Key)
            UI->>Local: storeEncryptionKey(Key)
            Local-->>UI: Stored Safely
        end
        
        UI-->>User: "Connection Successful"
    else Invalid / Mismatch
        API-->>UI: Error 403 / 404
        UI-->>User: "Invalid QR Code"
    end
```

### Sequence 3: File Decryption & Failure Handling ([DR] #17, [PT] #14)
**Goal:** Decrypt a downloaded file and notify the user if data integrity is compromised.

```mermaid
sequenceDiagram
    autonumber
    actor User as Doctor/Patient
    participant UI as FileList (Boundary)
    participant ClientCrypto as Encryption.ts (Control)
    participant API as files.py (Boundary)
    participant Storage as Supabase (Entity)

    User->>UI: Click Download File
    UI->>API: GET /api/files/download/{id}
    API->>Storage: Download Encrypted Blob
    Storage-->>API: Blob Data
    API-->>UI: Return Encrypted Blob
    
    UI->>ClientCrypto: decryptFile(Blob, Key, IV)
    
    alt Decryption Success
        ClientCrypto->>ClientCrypto: AES-GCM Decrypt
        ClientCrypto-->>UI: Return Decrypted File
        UI-->>User: Trigger File Download
    else Decryption Failure
        note over ClientCrypto: Auth Tag / Key Mismatch
        ClientCrypto->>ClientCrypto: AES-GCM Fail
        ClientCrypto-->>UI: Catch OperationError
        UI-->>User: Show Toast: "Decryption Failed!"
    end
```
