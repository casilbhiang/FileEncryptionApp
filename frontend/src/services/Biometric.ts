interface BiometricCredential {
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    device_name: string;
    created_at: string;
}

class BiometricService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = import.meta.env.VITE_API_URL || '';
    }

    // Check if biometrics are available on this current device
    async isBiometricAvailable(): Promise<boolean> {
        if (!window.PublicKeyCredential) {
            console.log('WebAuthn not supported in this browser.');
            return false;
        }

        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        } catch (error) {
            console.error('Error checking biometric availability:', error);
            return false;
        }
    }

    // Register biometric
    async registerBiometric(userId: string, userName: string): Promise<boolean> {
        try {
            if (!await this.isBiometricAvailable()) {
                throw new Error('Biometric authentication not available on this device.');
            }

            // Generate challenge from backend
            const challengeResponse = await fetch(`${this.apiUrl}/api/auth/biometric/challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, type: 'registration' })
            });

            if (!challengeResponse.ok) {
                throw new Error('Failed to get registration challenge from server.');
            }

            const { challenge } = await challengeResponse.json();

            // Create credential
            const credential = await navigator.credentials.create({
                publicKey: {
                challenge: this.base64ToArrayBuffer(challenge),
                rp: {
                    name: "SIM NCRYPT",
                    id: window.location.hostname
                },
                user: {
                    id: new TextEncoder().encode(userId),
                    name: userName,
                    displayName: userName
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },  // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    requireResidentKey: false
                },
                timeout: 60000,
                attestation: "none"
                }
            }) as PublicKeyCredential;

            if (!credential) {
                throw new Error('Failed to create credential');
            }

            // Send credential to backend
            const response = credential.response as AuthenticatorAttestationResponse;
            const credentialData = {
                user_id: userId,
                credential_id: this.arrayBufferToBase64(credential.rawId),
                public_key: this.arrayBufferToBase64(response.getPublicKey()!),
                device_name: this.getDeviceName(),
                attestation_object: this.arrayBufferToBase64(response.attestationObject),
                client_data_json: this.arrayBufferToBase64(response.clientDataJSON)
            };

            const registerResponse = await fetch(`${this.apiUrl}/api/auth/biometric/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentialData)
            });

            if (!registerResponse.ok) {
                throw new Error('Failed to register biometric credential');
            }

            console.log('Biometric registered successfully');
            return true;

            } catch (error) {
            console.error('Biometric registration error:', error);
            throw error;
            }
        }

        // Authenticate using biometric
        async authenticateBiometric(userId: string): Promise<boolean> {
            try {
            if (!await this.isBiometricAvailable()) {
                throw new Error('Biometric authentication not available');
            }

            // Get challenge and credential IDs from backend
            const challengeResponse = await fetch(`${this.apiUrl}/api/auth/biometric/challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, type: 'authentication' })
            });

            if (!challengeResponse.ok) {
                throw new Error('Failed to get authentication challenge');
            }

            const { challenge, credential_ids } = await challengeResponse.json();

            // Get credential
            const credential = await navigator.credentials.get({
                publicKey: {
                challenge: this.base64ToArrayBuffer(challenge),
                allowCredentials: credential_ids.map((id: string) => ({
                    type: "public-key",
                    id: this.base64ToArrayBuffer(id)
                })),
                userVerification: "required",
                timeout: 60000
                }
            }) as PublicKeyCredential;

            if (!credential) {
                throw new Error('Authentication cancelled or failed');
            }

            // Verify with backend
            const response = credential.response as AuthenticatorAssertionResponse;
            const authData = {
                user_id: userId,
                credential_id: this.arrayBufferToBase64(credential.rawId),
                authenticator_data: this.arrayBufferToBase64(response.authenticatorData),
                client_data_json: this.arrayBufferToBase64(response.clientDataJSON),
                signature: this.arrayBufferToBase64(response.signature)
            };

            const verifyResponse = await fetch(`${this.apiUrl}/api/auth/biometric/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authData)
            });

            if (!verifyResponse.ok) {
                throw new Error('Biometric verification failed');
            }

            console.log('Biometric authentication successful');
            return true;

            } catch (error) {
            console.error('Biometric authentication error:', error);
            throw error;
            }
        }

        // Check if user has registered biometric on this device
        async hasRegisteredBiometric(userId: string): Promise<boolean> {
            try {
            const response = await fetch(`${this.apiUrl}/api/auth/biometric/check?user_id=${userId}`);
            
            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.has_biometric || false;

            } catch (error) {
            console.error('Error checking biometric status:', error);
            return false;
            }
        }
        
        // Helper methods
        private arrayBufferToBase64(buffer: ArrayBuffer): string {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }

        private base64ToArrayBuffer(base64: string): ArrayBuffer {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        }

        private getDeviceName(): string {
            const ua = navigator.userAgent;
            if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Device';
            if (/Android/.test(ua)) return 'Android Device';
            if (/Mac/.test(ua)) return 'Mac';
            if (/Windows/.test(ua)) return 'Windows PC';
            if (/Linux/.test(ua)) return 'Linux PC';
            return 'Unknown Device';
        }
    }

    export default new BiometricService();