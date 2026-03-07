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
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [isInviting, setIsInviting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form State (Shared between Add and Edit)
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
                        return {
                            ...payload,
                            id: row.id,
                            created_at: row.created_at,
                            status: row.status,
                            position: row.position
                        };
                    } catch (err) {
                        console.error("Failed to decrypt coupon:", err);
                        // Return a fallback object that preserves metadata so the UI doesn't crash
                        return { 
                            title: t('decryptionFailed'), 
                            id: row.id, 
                            error: true, 
                            status: row.status,
                            created_at: row.created_at,
                            position: row.position
                        };
                    }
                }));
                decrypted.sort((a, b) => (a.position || 0) - (b.position || 0));
                setCoupons(decrypted);
            }
        } catch (err) {
            console.error("Failed to fetch coupons:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const res = await apiFetch(`/api/invites?list_id=${vaultId}`, {
                method: 'POST',
                body: JSON.stringify({ email: inviteEmail })
            });
            if (res.ok) {
                alert('Invite sent!');
                setInviteEmail('');
                setIsInviting(false);
            } else {
                alert('User not found or already invited.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setInviteLoading(false);
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

            const url = editingCoupon
                ? `/api/coupons?list_id=${vaultId}&id=${editingCoupon.id}`
                : `/api/coupons?list_id=${vaultId}`;

            const method = editingCoupon ? 'PATCH' : 'POST';

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify({ encrypted_payload: hybridPayload })
            });

            if (res.ok) {
                await fetchCoupons();
                setIsAdding(false);
                setEditingCoupon(null);
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

    const startEdit = (c) => {
        setEditingCoupon(c);
        setTitle(c.title || '');
        setCode(c.code || '');
        setValue(c.value || '');
        setImageBase64(c.imageBase64 || '');
        setIsAdding(false);
    };

    const handleMagicFormat = () => {
        // Remove existing hyphens
        const clean = code.replace(/-/g, '');
        if (clean.length > 0) {
            // Split into 4-character chunks
            const chunks = clean.match(/.{1,4}/g);
            if (chunks) {
                setCode(chunks.join('-'));
            }
        }
    };

    const handleReorder = async (coupon, direction) => {
        const index = coupons.findIndex(c => c.id === coupon.id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= coupons.length) return;

        const neighbor = coupons[newIndex];

        const updatedCoupons = [...coupons];
        const tempPos = coupon.position || 0;
        coupon.position = neighbor.position || 0;
        neighbor.position = tempPos;
        updatedCoupons.sort((a, b) => a.position - b.position);
        setCoupons(updatedCoupons);

        try {
            await Promise.all([
                apiFetch(`/api/coupons?list_id=${vaultId}&id=${coupon.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ position: coupon.position })
                }),
                apiFetch(`/api/coupons?list_id=${vaultId}&id=${neighbor.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ position: neighbor.position })
                })
            ]);
        } catch (err) {
            console.error("Reorder failed:", err);
            fetchCoupons();
        }
    };

    const markStatus = async (id, status) => {
        const confirmMsg = status === 'deleted' ? t('confirmDelete') : t('markUsed');
        if (!confirm(confirmMsg)) return;

        try {
            const method = status === 'deleted' ? 'DELETE' : 'PATCH';
            const body = status === 'used' ? JSON.stringify({ status: 'used' }) : null;

            const res = await apiFetch(`/api/coupons?list_id=${vaultId}&id=${id}`, {
                method,
                body
            });
            if (res.ok) fetchCoupons();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Card className="shadow-xl bg-card border-border">
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
                    <Button size="sm" onClick={() => { setIsAdding(!isAdding); setEditingCoupon(null); setTitle(''); setCode(''); setValue(''); setImageBase64(''); }}>
                        <Icons.Add size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('add')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="mb-6 opacity-40" />

                {isInviting && (
                    <Card className="mb-6 border-border bg-muted/30 animate-in slide-in-from-right-4 duration-300">
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
                                    className="text-start bg-background"
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

                {(isAdding || editingCoupon) && (
                    <Card className="mb-6 border-border bg-muted/20 shadow-lg animate-in fade-in duration-300">
                        <CardHeader className="text-start">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Icons.Coupon size={20} className="text-primary" /> {editingCoupon ? t('edit') : t('addCoupon')}
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={handleSaveCoupon}>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
                                <div className="space-y-2">
                                    <Label>{t('title')}</Label>
                                    <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="..." className="bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex justify-between items-center">
                                        {t('code')}
                                        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={handleMagicFormat}>
                                            <Icons.Shield size={10} className="mr-1 ml-1" /> {t('formatCode')}
                                        </Button>
                                    </Label>
                                    <Input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="bg-background font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('value')}</Label>
                                    <Input value={value} onChange={e => setValue(e.target.value)} placeholder="..." className="bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('image')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setImageBase64(reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }} className="cursor-pointer bg-background file:text-primary file:font-bold" />
                                        {imageBase64 && <Icons.Check className="text-green-500" />}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end">
                                <Button variant="ghost" type="button" onClick={() => { setIsAdding(false); setEditingCoupon(null); }}>{t('cancel')}</Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Shield size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                    {loading ? t('saving') : (editingCoupon ? t('save') : t('protectSave'))}
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
                    <div className="text-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-xl">
                        <Icons.Coupon size={64} className="mx-auto mb-4 opacity-10" />
                        <p className="text-muted-foreground">{t('noVaults')}</p>
                        <Button variant="link" onClick={() => setIsAdding(true)}>{t('addCoupon')}</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {coupons.filter(c => c.status !== 'deleted').map((c, idx) => (
                            <Card key={c.id} className={`group overflow-hidden border-border transition-all ${c.status === 'used' ? 'opacity-50 grayscale' : 'hover:bg-muted/30'}`}>
                                <div className={`flex items-center ${rtl ? 'flex-row-reverse' : ''}`}>
                                    {/* Reorder Controls */}
                                    <div className="flex flex-col border-r border-border bg-muted/50 p-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleReorder(c, 'up')} disabled={idx === 0}>
                                            <Icons.Key className="rotate-270 w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleReorder(c, 'down')} disabled={idx === coupons.length - 1}>
                                            <Icons.Key className="rotate-90 w-3 h-3" />
                                        </Button>
                                    </div>

                                    <div className="flex-1 p-6 text-start cursor-pointer" onClick={() => startEdit(c)}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold text-lg ${c.error ? 'text-destructive' : ''}`}>{c.title}</h4>
                                            {c.value && <Badge variant="outline" className="font-mono bg-background">{c.value}</Badge>}
                                            {c.status === 'used' && <Badge variant="secondary" className="uppercase text-[10px]">{t('activityFeed')}</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            <Icons.Lock size={12} /> {t('viewCode')}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1 uppercase tracking-widest font-semibold">
                                            <Icons.History size={10} /> {new Date(c.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {c.imageBase64 ? (
                                        <div className={`w-32 h-32 bg-white flex items-center justify-center ${rtl ? 'border-r' : 'border-l'} border-border shrink-0`}>
                                            <img src={c.imageBase64} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
                                        </div>
                                    ) : (
                                        <div className={`w-32 h-32 bg-muted/20 flex items-center justify-center ${rtl ? 'border-r' : 'border-l'} border-border shrink-0`}>
                                            <Icons.Image size={32} className="opacity-10" />
                                        </div>
                                    )}

                                    <div className={`p-2 bg-muted/50 border-l border-border shrink-0 self-stretch flex flex-col justify-center gap-2`}>
                                        {c.status !== 'used' && (
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); markStatus(c.id, 'used'); }} title={t('markUsed')}>
                                                <Icons.Check size={20} />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); markStatus(c.id, 'deleted'); }} title={t('delete')}>
                                            <Icons.Trash className="w-5 h-5" />
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
