import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { useLanguage } from './LanguageContext';

export function CouponList() {
    const { privateKey, publicKey, vaultId, vaultName } = useVault();
    const { apiFetch } = useAuth();
    const { t, rtl } = useLanguage();

    const [coupons, setCoupons] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Coupon Form State
    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [value, setValue] = useState('');
    const [imageBase64, setImageBase64] = useState('');
    const fileInputRef = useRef(null);

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        if (vaultId) {
            fetchCoupons();
        }
    }, [vaultId, privateKey]);

    const fetchCoupons = async () => {
        if (!privateKey) return;
        setFetching(true);
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}`);
            if (res.ok) {
                const data = await res.json();
                const decrypted = await Promise.all(data.map(async (row) => {
                    const encrypted = row.encrypted_payload;
                    try {
                        const aesKeyBase64 = await cryptoUtils.decryptRSA(encrypted.encrypted_aes_key, privateKey);
                        const aesKey = await cryptoUtils.importAESKey(aesKeyBase64);
                        const payloadStr = await cryptoUtils.decryptAES(encrypted.encrypted_data, encrypted.iv, aesKey);
                        const payload = JSON.parse(payloadStr);
                        return { ...payload, id: row.id, created_at: row.created_at };
                    } catch (err) {
                        console.error("Failed to decrypt coupon:", err);
                        return { title: t('decryptionFailed'), id: row.id, error: true };
                    }
                }));
                setCoupons(decrypted);
            }
        } catch (err) {
            console.error("Failed to fetch coupons:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        if (!publicKey) return alert("No active vault keys found.");

        setLoading(true);
        try {
            const payload = { title, code, value, imageBase64 };
            const payloadString = JSON.stringify(payload);

            const aesKey = await cryptoUtils.generateAESKey();
            const { cipher, iv } = await cryptoUtils.encryptAES(payloadString, aesKey);
            const aesKeyBase64 = await cryptoUtils.exportAESKey(aesKey);
            const encryptedAesKey = await cryptoUtils.encryptRSA(aesKeyBase64, publicKey);

            const hybridPayload = {
                encrypted_data: cipher,
                iv,
                encrypted_aes_key: encryptedAesKey
            };

            const res = await apiFetch(`/api/coupons?list_id=${vaultId}`, {
                method: 'POST',
                body: JSON.stringify({ encrypted_payload: hybridPayload })
            });

            if (res.ok) {
                await fetchCoupons();
                setIsAdding(false);
                setTitle(''); setCode(''); setValue(''); setImageBase64('');
            } else {
                alert("Failed to save coupon");
            }
        } catch (err) {
            console.error(err);
            alert('Encryption failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const res = await apiFetch('/api/invites', {
                method: 'POST',
                body: JSON.stringify({ list_id: vaultId, email: inviteEmail })
            });

            if (res.ok) {
                alert(`Invite sent to ${inviteEmail}!`);
                setInviteEmail('');
                setIsInviting(false);
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to invite");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setInviteLoading(false);
        }
    };

    const markUsed = async (id) => {
        if (!confirm(t('markUsed'))) return;
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}&id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchCoupons();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Card className="shadow-xl bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Icons.Cart size={24} className="text-primary" /> {vaultName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icons.Vault size={12} /> {t('id')}: {vaultId}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsInviting(!isInviting)}>
                        <Icons.UserPlus size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('share')}
                    </Button>
                    <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
                        <Icons.Add size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('add')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="mb-6 opacity-20" />

                {isInviting && (
                    <Card className="mb-6 border-primary/30 bg-primary/5 animate-in slide-in-from-right-4 duration-300">
                        <CardHeader className="py-4 text-start">
                            <CardTitle className="text-sm">{t('inviteMember')}</CardTitle>
                        </CardHeader>
                        <form onSubmit={handleInvite}>
                            <CardContent className="py-0 pb-4">
                                <Input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder={t('enterEmail')}
                                    className="text-start"
                                />
                            </CardContent>
                            <CardFooter className="flex gap-2 py-4 pt-0">
                                <Button size="sm" className="w-full" disabled={inviteLoading}>
                                    {inviteLoading ? <Loader2 className="animate-spin mr-2 ml-2" size={14} /> : <Icons.Share size={14} className={rtl ? 'ml-2' : 'mr-2'} />}
                                    {t('sendAccess')}
                                </Button>
                                <Button size="sm" variant="ghost" type="button" onClick={() => setIsInviting(false)}>
                                    <Icons.Logout size={14} className={rtl ? 'rotate-180' : ''} />
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {isAdding && (
                    <Card className="mb-6 border-primary bg-primary/10 shadow-lg animate-in fade-in duration-300">
                        <CardHeader className="text-start">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Icons.Coupon size={20} className="text-primary" /> {t('addCoupon')}
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={handleSaveCoupon}>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
                                <div className="space-y-2">
                                    <Label>{t('title')}</Label>
                                    <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('code')}</Label>
                                    <Input value={code} onChange={e => setCode(e.target.value)} placeholder="..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('value')}</Label>
                                    <Input value={value} onChange={e => setValue(e.target.value)} placeholder="..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('image')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer file:text-primary file:font-bold" />
                                        {imageBase64 && <Icons.Check className="text-green-500" />}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end">
                                <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>{t('cancel')}</Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Shield size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                    {t('protectSave')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {fetching ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
                        <Icons.Cart size={48} className="mb-4 opacity-20" />
                        <p>{t('decrypting')}</p>
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-xl">
                        <Icons.Coupon size={64} className="mx-auto mb-4 opacity-10" />
                        <p className="text-muted-foreground">{t('appName')} - {t('noVaults')}</p>
                        <Button variant="link" onClick={() => setIsAdding(true)}>{t('addCoupon')}</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {coupons.map((c) => (
                            <Card key={c.id} className="group overflow-hidden hover:border-primary/50 transition-all hover:bg-muted/30">
                                <div className={`flex items-center ${rtl ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-1 p-6 text-start">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold text-lg ${c.error ? 'text-destructive' : ''}`}>{c.title}</h4>
                                            {c.value && <Badge variant="secondary" className="font-mono">{c.value}</Badge>}
                                        </div>
                                        {c.code && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <code className="bg-primary/10 text-primary px-3 py-1 rounded font-mono text-lg tracking-wider border border-primary/20">
                                                    {c.code}
                                                </code>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(c.code)}>
                                                    <Icons.Share size={14} />
                                                </Button>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1 uppercase tracking-widest font-semibold">
                                            <Icons.History size={10} /> {new Date(c.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {c.imageBase64 ? (
                                        <div className={`w-32 h-32 bg-white flex items-center justify-center ${rtl ? 'border-r' : 'border-l'} shrink-0`}>
                                            <img src={c.imageBase64} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
                                        </div>
                                    ) : (
                                        <div className={`w-32 h-32 bg-secondary/30 flex items-center justify-center ${rtl ? 'border-r' : 'border-l'} shrink-0`}>
                                            <Icons.Image size={32} className="opacity-10" />
                                        </div>
                                    )}

                                    <div className={`p-4 bg-muted/50 group-hover:bg-primary/10 transition-colors ${rtl ? 'border-r' : 'border-l'} shrink-0 self-stretch flex flex-col justify-center`}>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => markUsed(c.id)}>
                                            <Icons.History size={20} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
