import { createContext, useContext, useState, ReactNode } from 'react';

interface VaultContextType {
    privateKey: CryptoKey | null;
    publicKey: CryptoKey | null;
    activeListKey: CryptoKey | null;
    setKeys: (publicK: CryptoKey, privateK: CryptoKey) => void;
    setActiveListAesKey: (aesKey: CryptoKey) => void;
    clearKeys: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
    const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
    const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
    const [activeListKey, setActiveListKey] = useState<CryptoKey | null>(null);

    const setKeys = (pub: CryptoKey, priv: CryptoKey) => {
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
