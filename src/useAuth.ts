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

    return { user, login, logout, isInitialized: true };
}
