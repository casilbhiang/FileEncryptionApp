import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { storage } from '../utils/storage';

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

    const login = (userData: User, newToken: string) => {
        setUser(userData);
        setToken(newToken);
        storage.setItem('user', JSON.stringify(userData));
        storage.setItem('token', newToken);
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
