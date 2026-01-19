/**
 * API Service for Key Management
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface KeyPair {
    key_id: string;
    doctor_id: string;
    patient_id: string;
    created_at: string;
    expires_at: string | null;
    status: 'Active' | 'Inactive' | 'Revoked';
}

export interface KeyPairResponse {
    success: boolean;
    key_pair: KeyPair;
    qr_code: string; // Base64 encoded QR code
}

export interface ListKeyPairsResponse {
    success: boolean;
    count: number;
    key_pairs: KeyPair[];
}

export interface QRCodeResponse {
    success: boolean;
    key_id: string;
    qr_code: string;
    expires_at?: string;
}

/**
 * Generate a new key pair
 */
export async function generateKeyPair(doctorId: string, patientId: string): Promise<KeyPairResponse> {
    const response = await fetch(`${API_BASE_URL}/keys/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            doctor_id: doctorId,
            patient_id: patientId,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate key pair');
    }

    return response.json();
}

/**
 * List all key pairs
 */
export async function listKeyPairs(): Promise<ListKeyPairsResponse> {
    const response = await fetch(`${API_BASE_URL}/keys/list`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list key pairs');
    }

    return response.json();
}

/**
 * Get QR code for a key pair
 */
export async function getKeyQRCode(keyId: string): Promise<QRCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/keys/qr/${keyId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get QR code');
    }

    return response.json();
}

/**
 * Delete a key pair
 */
export async function deleteKeyPair(keyId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/keys/${keyId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete key pair');
    }
}

/**
 * Verify scanned QR code
 */
export async function verifyScannedQR(qrData: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/keys/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_data: qrData }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify QR code');
    }

    return response.json();
}

/**
 * Get all connections for a user
 */
export async function getUserConnections(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/keys/connections/${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch connections');
    }

    return response.json();
}

/**
 * Get a specific key pair by ID (Optionally with full key)
 */
export async function getKeyPair(keyId: string, userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/keys/${keyId}?include_key=true&user_id=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch key pair');
    }

    return response.json();
}

/**
 * Refresh a key pair (Rotate Key)
 */
export async function refreshKeyPair(keyId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/keys/${keyId}/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh key pair');
    }

    return response.json();
}
