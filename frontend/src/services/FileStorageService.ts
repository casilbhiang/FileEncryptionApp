// services/FileStorageService.ts
export interface FileItem {
    id: string;
    name: string;
    file_size: number;
    uploaded_at: string;
    shared_by: string;
    is_shared?: boolean;
    file_extension?: string;
    shared_at?: string;
    last_accessed_at?: string | null;
    owner_id?: string;
    owner_name?: string;
    owner_role?: string;
    size?: number; // Legacy support
}

export interface RecentActivityItem {
    id: string;
    name: string;
    sharedBy: string;
    status: string;
    date: string;
    type: string;
    message: string;
    timestamp: string;
    formatted_date?: string;
    formatted_time?: string;
    icon?: string;
}

export interface UserInfo {
    user_name: string;
    role: string;
    welcome_message: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface FilterInfo {
    search: string;
    sort_by: string;
    sort_order: string;
    file_type: string;
    shared_status: string;
    filter_param: string;
}

export interface ApiResponse {
    success: boolean;
    data: FileItem[] | RecentActivityItem[];
    count?: number;
    pagination?: PaginationInfo;
    filters?: FilterInfo;
    mode: string;
    description: string;
    user_id: string;
    user_uuid: string;
    auth_method: string;
    user_info?: UserInfo;
    error?: string;
    message?: string;
}

const API_BASE_URL = 'http://localhost:5000/api/file-storage';

/**
 * Get recent activity (for Homepage/Dashboard)
 */
export const getRecentActivity = async (
    userId: string, 
    limit: number = 10
): Promise<ApiResponse> => {
    const params = new URLSearchParams({
        user_id: userId,
        mode: 'recent',
        limit: limit.toString()
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    console.log('📡 Fetching recent activity:', url);

    const response = await fetch(url, {
        headers: {
            'X-User-ID': userId  // Using header as recommended
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch recent activity: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Get files library (for MyFiles page)
 */
export const getFileLibrary = async (
    userId: string,
    search: string = '',
    sortBy: string = 'uploaded_at',
    filter: string = 'all',
    page: number = 1,
    limit: number = 20
): Promise<ApiResponse> => {
    const params = new URLSearchParams({
        user_id: userId,
        mode: 'library',
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        sort_by: sortBy,
        filter: filter
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    console.log('📡 Fetching file library:', url);

    const response = await fetch(url, {
        headers: {
            'X-User-ID': userId  // Using header as recommended
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file library: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Simplified version for MyFiles page (returns just files array)
 */
export const getMyFiles = async (
    userId: string,
    search: string = '',
    sortBy: string = 'uploaded_at',
    filter: string = 'all',
    limit: number = 1000
): Promise<{ files: FileItem[], total: number }> => {
    try {
        const response = await getFileLibrary(userId, search, sortBy, filter, 1, limit);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch files');
        }
        
        // Transform the response to match existing interface
        const files = response.data as FileItem[];
        const total = response.pagination?.total || files.length;
        
        return { files, total };
    } catch (error) {
        console.error('Error in getMyFiles:', error);
        throw error;
    }
};

/**
 * Test the API connection
 */
export const testApiConnection = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/test`);
    
    if (!response.ok) {
        throw new Error('API connection test failed');
    }
    
    return response.json();
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
        throw new Error('Health check failed');
    }
    
    return response.json();
};