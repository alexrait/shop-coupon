import { useState, useEffect } from 'react';
import { Lock, Key, Plus, FolderLock, Unlock } from 'lucide-react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';

export function VaultManager({ user }) {
    const { apiFetch } = useAuth();
    const { setKeys } = useVault();

    const [vaults, setVaults] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isCreating, setIsCreating] = useState(false);
    const [unlockingVault, setUnlockingVault] = useState(null);
    const [password, setPassword] = useState('');
    const [vaultName, setVaultName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadVaults();
    }, []);

    const loadVaults = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/vaults');
            if (res.ok) {
                const data = await res.json();
                setVaults(data);
            }
        } catch (e) {
            console.error('Failed to load vaults:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVault = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            // 1. Generate RSA Key Pair
            const rsaPair = await cryptoUtils.generateRSAKeyPair();

            // 2. Generate Salt & Derive AES Key from Password
            const salt = cryptoUtils.generateSalt();
            const saltBuffer = cryptoUtils.base64ToArrayBuffer(salt);
            const aesKey = await cryptoUtils.deriveKeyFromPassword(password, new Uint8Array(saltBuffer));

            // 3. Export Keys
            const pubBase64 = await cryptoUtils.exportPublicKey(rsaPair.publicKey);
            const privBase64 = await cryptoUtils.exportPrivateKey(rsaPair.privateKey);

            // 4. Encrypt Private Key with AES (Password derived)
            const encryptedPriv = await cryptoUtils.encryptAES(privBase64, aesKey);

            // Save to API
            const payload = {
                name: vaultName,
                salt,
                encrypted_private_key: encryptedPriv.cipher,
                iv: encryptedPriv.iv,
                public_key: pubBase64
            };

            const res = await apiFetch('/api/vaults', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save vault to server');

            const newVault = await res.json();
            setVaults([newVault, ...vaults]);

            // Save to active session automatically
            setKeys(rsaPair.publicKey, rsaPair.privateKey, newVault.id, newVault.name);

            // Reset form
            setIsCreating(false);
            setPassword('');
            setVaultName('');

        } catch (err) {
            console.error(err);
            alert('Failed to create vault.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnlockVault = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const vault = unlockingVault;

            // 1. Derive AES key from entered password and vault's salt
            const saltBuffer = cryptoUtils.base64ToArrayBuffer(vault.salt);
            const aesKey = await cryptoUtils.deriveKeyFromPassword(password, new Uint8Array(saltBuffer));

            // 2. Decrypt the Private Key
            const decryptedPrivStr = await cryptoUtils.decryptAES(
                vault.encrypted_private_key,
                vault.iv,
                aesKey
            );

            // 3. Import keys into memory
            const privateKey = await cryptoUtils.importPrivateKey(decryptedPrivStr);
            const publicKey = await cryptoUtils.importPublicKey(vault.public_key);

            // 4. Activate vault in context!
            setKeys(publicKey, privateKey, vault.id, vault.name);

            // Cleanup UI
            setUnlockingVault(null);
            setPassword('');

        } catch (err) {
            console.error("Unlock error:", err);
            alert('Incorrect password or corrupted vault.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="card animate-fade-in mt-4">
            <div className="flex items-center justify-between mb-4">
                <h3><Key size={20} className="inline mr-2" /> Your Vaults</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => { setIsCreating(!isCreating); setUnlockingVault(null); setPassword(''); }}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    <Plus size={18} /> New Vault
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateVault} className="card animate-fade-in" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '1rem' }}>
                    <h4 className="flex items-center gap-2"><Lock size={16} /> Create Encrypted Vault</h4>
                    <p style={{ fontSize: '0.875rem' }}>This password secures your private key. Do not lose it.</p>

                    <div className="form-group">
                        <label className="form-label">Vault Name</label>
                        <input type="text" className="form-input" required value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="e.g. Family Coupons" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Encryption Password</label>
                        <input type="password" className="form-input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Must be strong..." />
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary" disabled={actionLoading || !password || !vaultName}>
                            {actionLoading ? 'Encrypting...' : 'Generate Keys & Save Vault'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                    </div>
                </form>
            )}

            {unlockingVault && (
                <form onSubmit={handleUnlockVault} className="card animate-fade-in" style={{ background: 'var(--color-secondary-mix)', marginBottom: '1rem', border: '1px solid var(--color-primary)' }}>
                    <h4 className="flex items-center gap-2"><Unlock size={16} /> Unlock "{unlockingVault.name}"</h4>
                    <p style={{ fontSize: '0.875rem' }}>Enter the exact vault password to decrypt and load your records.</p>
                    <div className="form-group">
                        <input type="password" autoFocus className="form-input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Vault Password..." />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary" disabled={actionLoading || !password}>
                            {actionLoading ? 'Decrypting...' : 'Unlock Vault'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setUnlockingVault(null); setPassword(''); }}>Cancel</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading vaults...</div>
            ) : vaults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No vaults found. Create one to get started.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {vaults.map((vault) => (
                        <div key={vault.id}
                            className="card vault-item hover-scale"
                            style={{ padding: '1.5rem', cursor: 'pointer', textAlign: 'center', border: '1px solid var(--color-border)' }}
                            onClick={() => { setUnlockingVault(vault); setIsCreating(false); setPassword(''); }}
                        >
                            <FolderLock size={32} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
                            <h4 style={{ margin: '0' }}>{vault.name}</h4>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
