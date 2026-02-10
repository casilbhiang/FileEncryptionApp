
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

    const restoreSessionKey = async (userId: string) => {
        // Check if key already exists locally
        if (hasEncryptionKey(userId)) return;

        console.log('Attempting to auto-restore encryption key...');
        try {
            const result = await getUserConnections(userId);
            if (result.success && result.connections) {
                // strict check: Active AND Not Expired
                const activeConnections = result.connections.filter((c: any) => {
                    if (c.status !== 'Active') return false;
                    if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
                    return true;
                });

                for (const conn of activeConnections) {
                    try {
                        const keyResult = await getKeyPair(conn.key_id, userId);
                        if (keyResult.success && keyResult.key_pair?.encryption_key) {
                            const key = await importKeyFromBase64(keyResult.key_pair.encryption_key);
                            await storeEncryptionKey(key, userId);
                            console.log('Encryption key auto-restored successfully.');
                            // We found a valid key, so we can stop looking
                            return;
                        }
                    } catch (e) {
                        console.warn(`Failed to restore key from connection ${conn.key_id}`, e);
                        // Continue to next connection
                    }
                }
            }
        } catch (error) {
            console.warn('Auto-restore failed:', error);
        }
    };

    useEffect(() => {
        // Check for stored auth data on mount
        const storedUser = storage.getItem('user');
        const storedToken = storage.getItem('token');

        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);

                // Trigger auto-restore on page load/refresh
                restoreSessionKey(parsedUser.user_id);
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

        // Trigger auto-restore on login
        await restoreSessionKey(userData.user_id);
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
