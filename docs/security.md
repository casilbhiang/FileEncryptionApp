# Security Architecture

## Threat Model
- **Cloud provider cannot read files**: All files encrypted before upload
- **Network attackers cannot decrypt**: TLS + E2EE
- **Compromised server cannot decrypt**: Zero-knowledge architecture

## Encryption Details
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: Argon2id or PBKDF2-HMAC-SHA256
- **Authentication**: Built-in GMAC authentication tag

## Key Management
- Keys never leave client device unencrypted
- Master key derived from user password
- Per-file data encryption keys (DEK)
- Key rotation without re-encryption

## Implementation Rules
1. Use `cryptography` library only
2. Never implement custom crypto
3. All crypto code must be reviewed
4. Regular security audits