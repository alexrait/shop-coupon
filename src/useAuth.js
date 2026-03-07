import { useState, useEffect } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

export function useAuth() {
    const [user, setUser] = useState(netlifyIdentity.currentUser());

    useEffect(() => {
        // Initialize identity on mount
        netlifyIdentity.init();

        // Event listeners
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

    const login = () => netlifyIdentity.open('login');
    const logout = () => netlifyIdentity.logout();

    const apiFetch = async (endpoint, options = {}) => {
        if (!user) throw new Error('Not logged in');
        const token = await user.jwt();
        return fetch(endpoint, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    };

    return { user, login, logout, apiFetch, isInitialized: true };
}
