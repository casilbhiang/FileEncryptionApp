/**
 * API Service for Audit Logs
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    target: string;
    result: 'OK' | 'FAILED';
    details?: string;
}

export interface AuditLogsResponse {
    success: boolean;
    logs: AuditLog[];
    count: number;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(
    userId?: string,
    action?: string,
    result?: string,
    search?: string
): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (action) params.append('action', action);
    if (result) params.append('result', result);
    if (search) params.append('search', search);

    const url = `${API_BASE_URL}/audit/logs${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch audit logs');
    }

    return response.json();
}
