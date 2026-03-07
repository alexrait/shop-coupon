import { createContext, useContext, useState } from 'react';

const VaultContext = createContext(undefined);

export function VaultProvider({ children }) {
    const [privateKey, setPrivateKey] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
    const [activeListKey, setActiveListKey] = useState(null);

    const setKeys = (pub, priv) => {
        setPublicKey(pub);
        setPrivateKey(priv);
    };

    const clearKeys = () => {
        setPrivateKey(null);
        setPublicKey(null);
        setActiveListKey(null);
    };

    return (
        <VaultContext.Provider value={{ privateKey, publicKey, activeListKey, setKeys, setActiveListAesKey: setActiveListKey, clearKeys }}>
            {children}
        </VaultContext.Provider>
    );
}

export function useVault() {
    const context = useContext(VaultContext);
    if (context === undefined) {
        throw new Error('useVault must be used within a VaultProvider');
    }
    return context;
}
