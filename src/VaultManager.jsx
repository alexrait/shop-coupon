import { useState, useEffect } from 'react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export function VaultManager({ user }) {
    const { apiFetch } = useAuth();
    const { setKeys } = useVault();
    const { t, rtl } = useLanguage();

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
            const rsaPair = await cryptoUtils.generateRSAKeyPair();
            const salt = cryptoUtils.generateSalt();
            const saltBuffer = cryptoUtils.base64ToArrayBuffer(salt);
            const aesKey = await cryptoUtils.deriveKeyFromPassword(password, new Uint8Array(saltBuffer));

            const pubBase64 = await cryptoUtils.exportPublicKey(rsaPair.publicKey);
            const privBase64 = await cryptoUtils.exportPrivateKey(rsaPair.privateKey);

            const encryptedPriv = await cryptoUtils.encryptAES(privBase64, aesKey);

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
            setKeys(rsaPair.publicKey, rsaPair.privateKey, newVault.id, newVault.name);

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
            const saltBuffer = cryptoUtils.base64ToArrayBuffer(vault.salt);
            const aesKey = await cryptoUtils.deriveKeyFromPassword(password, new Uint8Array(saltBuffer));

            const decryptedPrivStr = await cryptoUtils.decryptAES(
                vault.encrypted_private_key,
                vault.iv,
                aesKey
            );

            const privateKey = await cryptoUtils.importPrivateKey(decryptedPrivStr);
            const publicKey = await cryptoUtils.importPublicKey(vault.public_key);

            setKeys(publicKey, privateKey, vault.id, vault.name);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                    <Icons.Key className="text-primary" /> {t('vaults')}
                </h3>
                <Button
                    onClick={() => { setIsCreating(!isCreating); setUnlockingVault(null); setPassword(''); }}
                >
                    <Icons.Add size={18} className={rtl ? 'ml-2' : 'mr-2'} /> {t('newVault')}
                </Button>
            </div>

            {isCreating && (
                <Card className="border-primary/50 bg-primary/5 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Icons.Vault size={20} className="text-primary" /> {t('createVault')}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{t('encryptionPassword')}</p>
                    </CardHeader>
                    <form onSubmit={handleCreateVault}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="vaultName">{t('vaultName')}</Label>
                                <Input
                                    id="vaultName"
                                    required
                                    value={vaultName}
                                    onChange={(e) => setVaultName(e.target.value)}
                                    placeholder={t('vaultName')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('encryptionPassword')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('encryptionPassword')}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={actionLoading || !password || !vaultName}>
                                {actionLoading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Shield size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                {t('generateKeys')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>{t('cancel')}</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {unlockingVault && (
                <Card className="border-primary bg-primary/10 shadow-lg animate-in zoom-in-95 duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Icons.LockOpen size={20} className="text-primary" /> {t('unlock')} "{unlockingVault.name}"
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{t('enterPassword')}</p>
                    </CardHeader>
                    <form onSubmit={handleUnlockVault}>
                        <CardContent>
                            <Input
                                type="password"
                                autoFocus
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('password')}
                            />
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={actionLoading || !password} className="w-full">
                                {actionLoading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Check size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                {t('unlock')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => { setUnlockingVault(null); setPassword(''); }}>{t('cancel')}</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            ) : vaults.length === 0 ? (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Icons.Folder size={48} className="mb-4 opacity-20" />
                        <p>{t('noVaults')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vaults.map((vault) => (
                        <Card
                            key={vault.id}
                            className="group cursor-pointer hover:border-primary transition-all hover:bg-primary/5 active:scale-95 text-center"
                            onClick={() => { setUnlockingVault(vault); setIsCreating(false); setPassword(''); }}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-8">
                                <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/20 transition-colors mb-4">
                                    <Icons.Vault size={40} className="text-primary" />
                                </div>
                                <h4 className="font-semibold text-lg">{vault.name}</h4>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
