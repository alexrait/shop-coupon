import { useState } from 'react';
import { Lock, Unlock, Key, Plus } from 'lucide-react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';

export function VaultManager({ user }: { user: any }) {
    const [isCreating, setIsCreating] = useState(false);
    const [password, setPassword] = useState('');
    const [vaultName, setVaultName] = useState('');
    const [loading, setLoading] = useState(false);

    const { setKeys } = useVault();

    const handleCreateVault = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
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

            // TODO: Save to database via API
            console.log("Vault Payload ready to save: ", {
                name: vaultName, // Currently plaintext, could be encryptAES'd too
                salt,
                encrypted_private_key: encryptedPriv.cipher,
                iv: encryptedPriv.iv,
                public_key: pubBase64
            });

            // Save to active session
            setKeys(rsaPair.publicKey, rsaPair.privateKey);

            // Reset form
            setIsCreating(false);
            setPassword('');
            setVaultName('');

        } catch (err) {
            console.error(err);
            alert('Failed to create vault.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card animate-fade-in mt-4">
            <div className="flex items-center justify-between mb-4">
                <h3><Key size={20} className="inline mr-2" /> Your Vaults</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreating(!isCreating)}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    <Plus size={18} /> New Vault
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateVault} className="card" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '1rem' }}>
                    <h4 className="flex items-center gap-2"><Lock size={16} /> Create Encrypted Vault</h4>
                    <p style={{ fontSize: '0.875rem' }}>This password secures your private key. Do not lose it.</p>

                    <div className="form-group">
                        <label className="form-label">Vault Name</label>
                        <input
                            type="text"
                            className="form-input"
                            required
                            value={vaultName}
                            onChange={(e) => setVaultName(e.target.value)}
                            placeholder="e.g. Family Coupons"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Encryption Password</label>
                        <input
                            type="password"
                            className="form-input"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Must be strong..."
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading || !password || !vaultName}>
                        {loading ? 'Encrypting...' : 'Generate Keys & Save Vault'}
                    </button>
                </form>
            )}

            {/* Placeholder for list of vaults fetched from API */}
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                No vaults found. Create one to get started.
            </div>
        </div>
    );
}
