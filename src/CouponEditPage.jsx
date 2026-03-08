import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useVault } from './VaultContext';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

function SortableCoupon({ coupon, startEdit, rtl, t, onDelete }) {
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
            className={`group/item flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-all ${coupon.status === 'used' ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/30 shadow-sm'}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-muted-foreground hover:text-primary transition-colors touch-manipulation"
                title="Drag to reorder"
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

            <div className={`flex items-center gap-1 ${rtl ? 'flex-row-reverse' : ''}`}>
                {coupon.status !== 'used' ? (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-green-600" 
                        onClick={(e) => { e.stopPropagation(); onDelete(coupon.id, true); }} 
                        title={t('markUsed')}
                    >
                        <Icons.Check size={16} />
                    </Button>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary" 
                        onClick={(e) => { e.stopPropagation(); onDelete(coupon.id, false); }} 
                        title={t('undo')}
                    >
                        <Icons.Undo2 size={16} />
                    </Button>
                )}
            </div>
        </div>
    );
}

export function CouponEditPage() {
    const { vaultId, vaultName } = useVault();
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { couponId } = useParams();
    const { t, rtl } = useLanguage();

    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [value, setValue] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [imageBase64, setImageBase64] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    const isNew = couponId === 'new';
    const isUrl = code.startsWith('http://') || code.startsWith('https://');

    useEffect(() => {
        if (!isNew && couponId) {
            fetchCoupon();
        } else {
            setLoading(false);
        }
    }, [couponId]);

    const fetchCoupon = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}&id=${couponId}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setTitle(data.title || '');
                    setCode(data.code || '');
                    setValue(data.value || '');
                    setExpiryDate(data.expiry_date ? data.expiry_date.split('T')[0] : '');
                    setImageBase64(data.image_base64 || '');
                    setStatus(data.status || 'active');
                }
            }
        } catch (err) {
            console.error("Failed to fetch coupon:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setSaving(true);
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}${isNew ? '' : `&id=${couponId}`}`, {
                method: isNew ? 'POST' : 'PATCH',
                body: JSON.stringify({
                    title: title.trim(),
                    code: code.trim(),
                    value: value.trim(),
                    expiry_date: expiryDate || null,
                    image_base64: imageBase64 || null
                })
            });

            if (res.ok) {
                navigate(-1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkUsed = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}&id=${couponId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: status === 'used' ? 'active' : 'used' })
            });

            if (res.ok) {
                setStatus(status === 'used' ? 'active' : 'used');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleMagicFormat = () => {
        // Simple formatting for common coupon patterns
        const cleaned = code.replace(/[\s-]/g, '').toUpperCase();
        if (cleaned.length === 16) {
            setCode(`${cleaned.slice(0,4)}-${cleaned.slice(4,8)}-${cleaned.slice(8,12)}-${cleaned.slice(12,16)}`);
        } else if (cleaned.length === 12) {
            setCode(`${cleaned.slice(0,4)}-${cleaned.slice(4,8)}-${cleaned.slice(8,12)}`);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t('confirmDelete'))) return;
        try {
            await apiFetch(`/api/coupons?list_id=${vaultId}&id=${couponId}`, {
                method: 'DELETE'
            });
            navigate(-1);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <Card className="shadow-xl bg-card border-border">
                <CardContent className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-xl bg-card border-border">
            <CardHeader className="pb-2">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shrink-0 border border-transparent hover:border-primary/20" 
                            onClick={() => navigate(-1)}
                            title={t('back')}
                        >
                            {rtl ? <Icons.ChevronRight size={24} /> : <Icons.ChevronLeft size={24} />}
                        </Button>
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Icons.Coupon size={24} className="text-primary shrink-0" />
                                {isNew ? t('addCoupon') : t('edit')}
                            </CardTitle>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="mb-6 opacity-40" />

                <form id="save-form" onSubmit={handleSave} className="space-y-4 pb-24">
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
                        {isUrl ? (
                            <a 
                                href={code} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
                            >
                                <Icons.ExternalLink size={14} />
                                {code}
                            </a>
                        ) : (
                            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="bg-background/50 font-mono" />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('value')}</Label>
                            <Input value={value} onChange={e => setValue(e.target.value)} placeholder="..." className="bg-background/50" />
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

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('image')}</Label>
                        <Input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setImageBase64(reader.result);
                                reader.readAsDataURL(file);
                            }
                        }} className="cursor-pointer bg-background/50 text-[10px] file:text-primary file:font-bold h-9" />
                    </div>
                    
                    {imageBase64 && (
                        <div className="mt-2 border border-border rounded overflow-hidden w-20 h-20 bg-white flex items-center justify-center mx-auto">
                            <img src={imageBase64} alt="Preview" className="max-w-[90%] max-h-[90%] object-contain" />
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        {!isNew && (
                            <>
                                <Button 
                                    type="button"
                                    variant={status === 'used' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={handleMarkUsed}
                                    disabled={saving}
                                    className={status === 'used' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    <Icons.Check size={16} className={rtl ? 'ml-2' : 'mr-2'} />
                                    {status === 'used' ? t('undo') : t('markUsed')}
                                </Button>
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDelete}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Icons.Trash size={16} className={rtl ? 'ml-2' : 'mr-2'} />
                                    {t('delete')}
                                </Button>
                            </>
                        )}
                        <div className="flex-1" />
                        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" form="save-form" disabled={saving || !title.trim()} className="min-w-[120px]">
                            {saving ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Shield size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                            {saving ? t('saving') : (isNew ? t('protectSave') : t('save'))}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
