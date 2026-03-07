import { createContext, useContext, useState } from 'react';

const VaultContext = createContext(undefined);

export function VaultProvider({ children }) {
    const [privateKey, setPrivateKey] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
    const [activeListKey, setActiveListKey] = useState(null);
    const [vaultId, setVaultId] = useState(null);
    const [vaultName, setVaultName] = useState(null);

    const setKeys = (pub, priv, id, name) => {
        setPublicKey(pub);
        setPrivateKey(priv);
        setVaultId(id);
        setVaultName(name);
    };

    const clearKeys = () => {
        setPrivateKey(null);
        setPublicKey(null);
        setActiveListKey(null);
        setVaultId(null);
        setVaultName(null);
    };

    return (
        <VaultContext.Provider value={{ privateKey, publicKey, activeListKey, vaultId, vaultName, setKeys, setActiveListAesKey: setActiveListKey, clearKeys }}>
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
