import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        netlifyIdentity.init();
        
        const currentUser = netlifyIdentity.currentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        
        setIsInitialized(true);

        netlifyIdentity.on('login', (u) => {
            setUser(u);
            netlifyIdentity.close();
        });

        netlifyIdentity.on('logout', () => {
            setUser(null);
        });

        return () => {
            netlifyIdentity.off('login');
            netlifyIdentity.off('logout');
        };
    }, []);

    const login = useCallback(() => netlifyIdentity.open('login'), []);
    const logout = useCallback(() => {
        netlifyIdentity.logout();
        setUser(null);
    }, []);

    const apiFetch = useCallback(async (endpoint, options = {}) => {
        // Use netlifyIdentity.currentUser() directly to get the freshest user object
        const currentUser = netlifyIdentity.currentUser();
        if (!currentUser) throw new Error('Not logged in');
        
        try {
            // Force refresh token if needed
            const token = await currentUser.jwt(true); 
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Check for 401 Unauthorized (expired token)
            if (response.status === 401) {
                console.warn('Token expired, logging out...');
                netlifyIdentity.logout();
                setUser(null);
                throw new Error('Session expired');
            }
            
            return response;
        } catch (err) {
            console.error('Auth fetch error:', err);
            throw err;
        }
    }, []);

    const value = {
        user,
        isInitialized,
        login,
        logout,
        apiFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
