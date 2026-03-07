import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { useLanguage } from './LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";

function SortableCouponItem({ coupon, idx, rtl, t, startEdit, markStatus }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: coupon.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`group/item flex items-center gap-3 p-2 bg-card border border-border rounded-lg transition-all ${coupon.status === 'used' ? 'opacity-50 grayscale' : 'hover:bg-muted/30 shadow-sm'}`}
        >
            {/* Grip Handle */}
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-primary transition-colors"
            >
                <Icons.Grip size={16} />
            </div>

            {/* Main Content (Compact) */}
            <div className={`flex-1 flex items-center gap-4 min-w-0 ${rtl ? 'flex-row-reverse' : ''}`} onClick={() => startEdit(coupon)}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm truncate ${coupon.error ? 'text-destructive' : ''}`}>
                            {coupon.title}
                        </h4>
                        {coupon.status === 'used' && (
                            <Badge variant="secondary" className="text-[8px] uppercase py-0 px-1 shrink-0">
                                {t('activityFeed')}
                            </Badge>
                        )}
                        {coupon.expiryDate && coupon.status !== 'used' && (() => {
                            const expiry = new Date(coupon.expiryDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const diff = expiry - today;
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            if (days < 0) return <Badge variant="destructive" className="text-[8px] uppercase py-0 px-1 shrink-0">{t('expired')}</Badge>;
                            if (days <= 7) return <Badge className="text-[8px] uppercase py-0 px-1 shrink-0 bg-orange-500 hover:bg-orange-600 border-none">{t('expiresIn', { days })}</Badge>;
                            return <Badge variant="outline" className="text-[8px] uppercase py-0 px-1 shrink-0 opacity-50">{t('expiresIn', { days })}</Badge>;
                        })()}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Icons.Lock size={10} /> {t('viewCode')}</span>
                        <span className="flex items-center gap-1"><Icons.History size={10} /> {new Date(coupon.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-1 transition-opacity ${rtl ? 'flex-row-reverse' : ''}`}>
                {coupon.status !== 'used' && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary" 
                        onClick={(e) => { e.stopPropagation(); markStatus(coupon.id, 'used'); }} 
                        title={t('markUsed')}
                    >
                        <Icons.Check size={16} />
                    </Button>
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                    onClick={(e) => { e.stopPropagation(); markStatus(coupon.id, 'deleted'); }} 
                    title={t('delete')}
                >
                    <Icons.Trash size={16} />
                </Button>
            </div>
        </div>
    );
}

export function CouponList() {
    const { privateKey, publicKey, vaultId, vaultName, updateVaultName, closeVault } = useVault();
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const { t, rtl } = useLanguage();

    const [coupons, setCoupons] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [isInviting, setIsInviting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [isRenamingVault, setIsRenamingVault] = useState(false);
    const [newVaultName, setNewVaultName] = useState(vaultName || '');

    // Form State
    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [value, setValue] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [imageBase64, setImageBase64] = useState('');
    const fileInputRef = useRef(null);

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (vaultId) {
            fetchCoupons();
        }
    }, [vaultId, privateKey]);

    useEffect(() => {
        if (!isDialogOpen) {
            // Reset form when dialog closes
            setEditingCoupon(null);
            setTitle(''); setCode(''); setValue(''); setExpiryDate(''); setImageBase64('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isDialogOpen]);

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

    const expiringSoonCount = coupons.filter(c => {
        if (!c.expiryDate || c.status === 'used' || c.status === 'deleted') return false;
        const expiry = new Date(c.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = expiry - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
    }).length;

    const handleSaveCoupon = async (e) => {
        if (e) e.preventDefault();
        if (!publicKey) return alert("No active vault keys found.");

        setLoading(true);
        try {
            const payload = { title, code, value, imageBase64, expiryDate };
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
                if (!editingCoupon) {
                    // Reset for next multi-add
                    setTitle(''); setCode(''); setValue(''); setExpiryDate(''); setImageBase64('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    setIsDialogOpen(false);
                }
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
        setExpiryDate(c.expiryDate || '');
        setImageBase64(c.imageBase64 || '');
        setIsDialogOpen(true);
    };

    const handleMagicFormat = () => {
        const clean = code.replace(/-/g, '');
        if (clean.length > 0) {
            const chunks = clean.match(/.{1,4}/g);
            if (chunks) {
                setCode(chunks.join('-'));
            }
        }
    };

    const handleRenameVault = async (e) => {
        if (e) e.preventDefault();
        if (!newVaultName.trim()) return;
        try {
            const res = await apiFetch(`/api/vaults?list_id=${vaultId}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: newVaultName })
            });
            if (res.ok) {
                updateVaultName(newVaultName);
                setIsRenamingVault(false);
            } else {
                alert("Failed to rename vault. Only the owner can rename.");
            }
        } catch (err) {
            console.error(err);
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

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = coupons.findIndex((item) => item.id === active.id);
        const newIndex = coupons.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(coupons, oldIndex, newIndex);
        
        // Optimistic UI update
        // We need to recalculate positions to ensure they are unique and ordered
        const updatedItems = newItems.map((item, index) => ({
            ...item,
            position: index * 10
        }));
        setCoupons(updatedItems);

        try {
            // Update the positions in the backend
            // For simplicity, we just update the two neighbors or all affected?
            // Actually, dnd-kit gives us the final order. Best to persist the changed positions.
            await Promise.all(updatedItems.map((c, idx) => {
                if (c.position !== coupons.find(orig => orig.id === c.id)?.position) {
                    return apiFetch(`/api/coupons?list_id=${vaultId}&id=${c.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ position: c.position })
                    });
                }
                return Promise.resolve();
            }));
        } catch (err) {
            console.error("Reorder failed:", err);
            fetchCoupons(); // Revert on failure
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

    return (
        <>
            <Card className="shadow-xl bg-card border-border">
                <CardHeader className="pb-2">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shrink-0 border border-transparent hover:border-primary/20" 
                                onClick={() => { closeVault(); navigate('/dashboard'); }}
                                title={t('back')}
                            >
                                {rtl ? <Icons.ChevronRight size={24} /> : <Icons.ChevronLeft size={24} />}
                            </Button>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Icons.Cart size={24} className="text-primary shrink-0" />
                                    {isRenamingVault ? (
                                    <form onSubmit={handleRenameVault} className="flex items-center gap-2">
                                        <Input 
                                            size="sm"
                                            value={newVaultName}
                                            onChange={(e) => setNewVaultName(e.target.value)}
                                            className="h-8 py-0 px-2 min-w-[150px]"
                                            autoFocus
                                        />
                                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" type="submit">{t('save')}</Button>
                                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" type="button" onClick={() => { setIsRenamingVault(false); setNewVaultName(vaultName); }}>{t('cancel')}</Button>
                                    </form>
                                ) : (
                                    <CardTitle className="group/title flex items-center gap-2 cursor-pointer" onClick={() => { setIsRenamingVault(true); setNewVaultName(vaultName); }}>
                                        {vaultName}
                                        <Icons.Edit size={14} className="opacity-0 group-hover/title:opacity-50 transition-opacity" />
                                    </CardTitle>
                                )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsInviting(!isInviting)}>
                                <Icons.UserPlus size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('share')}
                            </Button>
                            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                                <Icons.Add size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('add')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="mb-6 opacity-40" />

                    {expiringSoonCount > 0 && (
                        <div className="mb-6 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-3 text-orange-500 animate-pulse">
                            <Icons.Shield size={18} />
                            <p className="text-sm font-semibold">{t('expirationWarning', { count: expiringSoonCount })}</p>
                        </div>
                    )}

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

                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
                            <Icons.Cart size={48} className="mb-4 opacity-20" />
                            <p>{t('decrypting')}</p>
                        </div>
                    ) : coupons.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-xl">
                            <Icons.Coupon size={64} className="mx-auto mb-4 opacity-10" />
                            <p className="text-muted-foreground">{t('noVaults')}</p>
                            <Button variant="link" onClick={() => setIsDialogOpen(true)}>{t('addCoupon')}</Button>
                        </div>
                    ) : (
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-2">
                                <SortableContext 
                                    items={coupons.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {coupons.filter(c => c.status !== 'deleted').map((c, idx) => (
                                        <SortableCouponItem 
                                            key={c.id} 
                                            coupon={c} 
                                            idx={idx} 
                                            rtl={rtl} 
                                            t={t} 
                                            startEdit={startEdit} 
                                            markStatus={markStatus} 
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md bg-card border-border shadow-2xl overflow-hidden p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 text-start border-b border-border bg-muted/20">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Icons.Coupon size={24} className="text-primary" /> 
                            {editingCoupon ? t('edit') : t('addCoupon')}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSaveCoupon}>
                        <div className="p-6 space-y-4 text-start">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('title')}</Label>
                                <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="..." className="bg-background/50" />
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="flex justify-between items-center text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                    {t('code')}
                                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary" onClick={handleMagicFormat}>
                                        <Icons.Shield size={10} className="mr-1 ml-1" /> {t('formatCode')}
                                    </Button>
                                </Label>
                                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="bg-background/50 font-mono" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('value')}</Label>
                                    <Input value={value} onChange={e => setValue(e.target.value)} placeholder="..." className="bg-background/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('image')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setImageBase64(reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }} className="cursor-pointer bg-background/50 text-[10px] file:text-primary file:font-bold h-9" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('expirationDate')}</Label>
                                    <Input 
                                        type="date" 
                                        value={expiryDate} 
                                        onChange={e => setExpiryDate(e.target.value)} 
                                        className="bg-background/50 h-9" 
                                    />
                                </div>
                            </div>
                            
                            {imageBase64 && (
                                <div className="mt-2 border border-border rounded overflow-hidden w-20 h-20 bg-white flex items-center justify-center mx-auto">
                                    <img src={imageBase64} alt="Preview" className="max-w-[90%] max-h-[90%] object-contain" />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-2 bg-muted/10 border-t border-border gap-2">
                            <Button variant="ghost" type="button" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit" disabled={loading} className="min-w-[120px]">
                                {loading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Shield size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                {loading ? t('saving') : (editingCoupon ? t('save') : t('protectSave'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
