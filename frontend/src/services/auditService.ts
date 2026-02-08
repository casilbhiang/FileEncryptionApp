/**
 * API Service for Audit Logs
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

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
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

/**
 * Get audit logs with optional filters and pagination
 */
export async function getAuditLogs(
    userId?: string,
    action?: string,
    result?: string,
    search?: string,
    page?: number,
    perPage?: number,
    excludeKeys?: boolean,
    keysOnly?: boolean
): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (action) params.append('action', action);
    if (result) params.append('result', result);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    if (excludeKeys) params.append('exclude_keys', 'true');
    if (keysOnly) params.append('keys_only', 'true');

    const url = `${API_BASE_URL}/api/audit/logs${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch audit logs');
    }

    return response.json();
}
