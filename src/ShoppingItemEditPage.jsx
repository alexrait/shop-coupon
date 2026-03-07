import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function ShoppingItemEditPage() {
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const { listId, itemId } = useParams();
    const { t, rtl } = useLanguage();

    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (listId && itemId) {
            fetchItem();
        }
    }, [listId, itemId]);

    const fetchItem = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/shopping-items?list_id=${listId}&id=${itemId}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setItemName(data.encrypted_name || '');
                    setQuantity(data.quantity || 1);
                    setNote(data.note || '');
                    setStatus(data.status || 'pending');
                }
            }
        } catch (err) {
            console.error("Failed to fetch item:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!itemName.trim()) return;

        setSaving(true);
        try {
            const res = await apiFetch(`/api/shopping-items?list_id=${listId}&id=${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    encrypted_name: itemName.trim(),
                    quantity: parseInt(quantity) || 1,
                    note: note || null,
                    status: status
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

    const handleStatusToggle = () => {
        setStatus(prev => prev === 'bought' ? 'pending' : 'bought');
    };

    const handleDelete = async () => {
        if (!confirm(t('confirmDeleteItem'))) return;
        try {
            const res = await apiFetch(`/api/shopping-items?list_id=${listId}&id=${itemId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                navigate(-1);
            }
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
                                <Icons.ShoppingCart size={24} className="text-primary shrink-0" />
                                {t('editItem')}
                            </CardTitle>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Separator className="mb-6 opacity-40" />

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('itemName')}</Label>
                        <Input required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="..." className="bg-background/50" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('quantity')}</Label>
                            <Input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="bg-background/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('note')}</Label>
                        <Input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('notePlaceholder')}
                            className="bg-background/50"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button 
                            type="button"
                            variant={status === 'bought' ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleStatusToggle}
                            disabled={saving}
                            className={status === 'bought' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            <Icons.Check size={16} className={rtl ? 'ml-2' : 'mr-2'} />
                            {status === 'bought' ? t('undo') : t('markBought')}
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
                        <div className="flex-1" />
                        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={saving || !itemName.trim()} className="min-w-[120px]">
                            {saving ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Check size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                            {saving ? t('saving') : t('save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
