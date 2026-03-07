import { createContext, useContext, useState, useEffect } from 'react';
import { persistenceUtils } from './lib/persistence';
import { useAuth } from './useAuth';

const VaultContext = createContext(undefined);

export function VaultProvider({ children }) {
    const { user } = useAuth();
    const [privateKey, setPrivateKey] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
    const [activeListKey, setActiveListKey] = useState(null);
    const [vaultId, setVaultId] = useState(null);
    const [vaultName, setVaultName] = useState(null);

    const setKeys = async (pub, priv, id, name) => {
        setPublicKey(pub);
        setPrivateKey(priv);
        setVaultId(id);
        setVaultName(name);

        if (user?.id && priv) {
            try {
                await persistenceUtils.saveKey(id, user.id, priv);
            } catch (err) {
                console.error("Failed to persist key locally:", err);
            }
        }
    };

    const updateVaultName = (newName) => {
        setVaultName(newName);
    };

    const closeVault = () => {
        setPrivateKey(null);
        setPublicKey(null);
        setActiveListKey(null);
        setVaultId(null);
        setVaultName(null);
    };

    const clearKeys = async () => {
        if (user?.id && vaultId) {
            await persistenceUtils.removeKey(vaultId, user.id);
        }
        setPrivateKey(null);
        setPublicKey(null);
        setActiveListKey(null);
        setVaultId(null);
        setVaultName(null);
    };

    return (
        <VaultContext.Provider value={{ privateKey, publicKey, activeListKey, vaultId, vaultName, setKeys, setActiveListAesKey: setActiveListKey, clearKeys, updateVaultName }}>
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
