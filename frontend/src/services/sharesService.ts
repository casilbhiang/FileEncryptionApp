// services/sharesService.ts - CORRECTED VERSION

const SHARES_API = 'http://localhost:5000/api/shares'; // Add this constant

export interface ShareFileParams {
  file_id: string;
  shared_by: string;
  shared_by_uuid: string;
  shared_with: string;
  access_level?: 'read';
  message?: string;
}

export interface Share {
  id: string;
  file_id: string;
  shared_by: string;
  shared_with: string;
  access_level: 'read';
  share_status: 'active';
  shared_at: string;
  revoked_at?: string;
}

// Share a file
export const shareFile = async (params: ShareFileParams) => {
  try {
    const response = await fetch(`${SHARES_API}/share`, { // Use the constant
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Failed to share file' };
    }
  } catch (error) {
    console.error('Error sharing file:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get files shared with me
export const getSharedWithMe = async (userId: string, options?: {
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  try {
    const params = new URLSearchParams({
      user_id: userId,
      ...(options?.search && { search: options.search }),
      ...(options?.sort && { sort: options.sort || 'shared_at' }), // Add default
      ...(options?.order && { order: options.order || 'desc' }),   // Add default
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(`${SHARES_API}/shared-with-me?${params}`); // Use constant
    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error fetching shared files:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get files I've shared
export const getMyShares = async (userId: string, options?: {
  page?: number;
  limit?: number;
}) => {
  try {
    const params = new URLSearchParams({
      user_id: userId,
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(`${SHARES_API}/my-shares?${params}`); // Use constant
    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error fetching my shares:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get available users to share with
export const getAvailableUsers = async (userId: string) => {
  try {
    const response = await fetch(`${SHARES_API}/available-users?user_id=${userId}`);
    const data = await response.json();

    if (response.ok) {
      // Check for both formats
      const users = data.users || data.data || [];
      return { success: true, data: users };
    } else {
      return { success: false, error: data.error || 'Failed to load users' };
    }
  } catch (error) {
    console.error('Error fetching available users:', error);
    return { success: false, error: 'Network error' };
  }
};


// Revoke a share
export const revokeShare = async (shareId: string, userId: string) => {
  try {
    const response = await fetch(`${SHARES_API}/${shareId}/revoke?user_id=${userId}`, { // Use constant
      method: 'POST',
    });

    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json();
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error revoking share:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get shares for a specific file
export const getFileShares = async (fileId: string, userId: string) => {
  try {
    const response = await fetch(`${SHARES_API}/file/${fileId}?user_id=${userId}`); // Use constant
    const data = await response.json();

    if (response.ok) {
      return { success: true, data: data.shares };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error fetching file shares:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get files already shared with a specific recipient
export const getFilesSharedWithRecipient = async (
  sharedBy: string,
  sharedWith: string
) => {
  try {
    // Direct API call to get files shared with this specific recipient
    const response = await fetch(
      `${SHARES_API}/shared-with/${sharedWith}?shared_by=${sharedBy}`
    );
    
    if (response.ok) {
      const data = await response.json();
      const fileIds = Array.isArray(data.file_ids) ? data.file_ids : [];
      return { success: true, data: fileIds };
    } else {
      // Fallback to the existing method if the endpoint doesn't exist
      const fallbackResponse = await fetch(
        `${SHARES_API}/my-shares?user_id=${sharedBy}&limit=100`
      );
      const data = await fallbackResponse.json();
      
      if (fallbackResponse.ok) {
        const shares = Array.isArray(data.shares) ? data.shares : [];
        const fileIds = shares
          .filter((share: any) => share.shared_with === sharedWith)
          .map((share: any) => share.file_id);
        return { success: true, data: fileIds };
      } else {
        return { success: false, error: data.error || 'Failed to fetch shared files' };
      }
    }
  } catch (error) {
    console.error('Error fetching files shared with recipient:', error);
    return { success: false, error: 'Network error' };
  }
};