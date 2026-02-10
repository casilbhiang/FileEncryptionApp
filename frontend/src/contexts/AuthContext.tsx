
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { storage } from '../utils/storage';
import { getUserConnections, getKeyPair } from '../services/keyService';
import { hasEncryptionKey, storeEncryptionKey, importKeyFromBase64 } from '../services/Encryption';

interface User {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    is_first_login: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // SECURITY: Cleanup legacy plaintext localStorage from older versions
        // We now use storage (cookies/encrypted), so these raw keys are dangerous.
        const legacyKeys = ['user', 'token', 'auth_token', 'user_role', 'user_id', 'user_email'];
        legacyKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.warn(`Security Cleanup: Removing legacy plaintext item '${key}' from localStorage`);
                localStorage.removeItem(key);
            }
        });

        // Also clean up any potential raw encryption keys if they exist in LS
        // (Note: This is a broad cleanup, specific user keys might be prefixed)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('encryptionKey_') || key.includes('private_key'))) {
                console.warn(`Security Cleanup: Removing legacy key item '${key}'`);
                localStorage.removeItem(key);
            }
        }

        // Check for stored auth data on mount
        const storedUser = storage.getItem('user');
        const storedToken = storage.getItem('token');

        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                storage.removeItem('user');
                storage.removeItem('token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (userData: User, newToken: string) => {
        setUser(userData);
        setToken(newToken);
        storage.setItem('user', JSON.stringify(userData));
        storage.setItem('token', newToken);

        try {
            // Auto-restore key if missing
            if (!hasEncryptionKey(userData.user_id)) {
                console.log('Auto-Restoring Encryption Key...');
                const result = await getUserConnections(userData.user_id);
                if (result.success && result.connections) {
                    const activeConnections = result.connections.filter((c: any) => c.status === 'Active');
                    for (const conn of activeConnections) {
                        try {
                            const keyResult = await getKeyPair(conn.key_id, userData.user_id);
                            if (keyResult.success && keyResult.key_pair?.encryption_key) {
                                const key = await importKeyFromBase64(keyResult.key_pair.encryption_key);
                                await storeEncryptionKey(key, userData.user_id);
                                console.log('Key Auto-Restored!');
                                break;
                            }
                        } catch (e) {
                            console.warn(`Failed to restore from ${conn.key_id}`, e);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Auto-Restore failed:', error);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        storage.removeItem('user');
        storage.removeItem('token');
        // Clear encryption keys as well for security
        storage.removeItem('encrypted_private_key');
        storage.removeItem('public_key');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user && !!token,
                login,
                logout,
                isLoading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
