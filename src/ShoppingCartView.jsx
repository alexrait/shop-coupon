import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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

import { useAuth } from './useAuth';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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

function SortableItem({ item, rtl, t, onStatusChange, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const isBought = item.status === 'bought';

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`group/item flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-all ${isBought ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/30 shadow-sm'}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-muted-foreground hover:text-primary transition-colors touch-manipulation"
                title="Drag to reorder"
            >
                <Icons.Grip size={20} />
            </div>

            <div className="flex-1 min-w-0" onClick={() => onEdit(item)}>
                <div className="flex items-center gap-2">
                    <h4 className={`font-semibold text-sm truncate ${isBought ? 'line-through text-muted-foreground' : ''}`}>
                        {item.encrypted_name}
                    </h4>
                    {item.quantity > 1 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 bg-background font-mono shrink-0">
                            x{item.quantity}
                        </Badge>
                    )}
                    {isBought && (
                        <Badge variant="secondary" className="text-[8px] uppercase py-0 px-1 shrink-0 bg-green-500/20 text-green-600">
                            {t('bought')}
                        </Badge>
                    )}
                </div>
                {item.note && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Icons.Alert size={10} /> {item.note}
                    </p>
                )}
            </div>

            <div className={`flex items-center gap-1 ${rtl ? 'flex-row-reverse' : ''}`}>
                {!isBought ? (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-green-600" 
                        onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'bought'); }} 
                        title={t('markBought')}
                    >
                        <Icons.Check size={16} />
                    </Button>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary" 
                        onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'pending'); }} 
                        title={t('markPending')}
                    >
                        <Icons.ChevronRight size={16} />
                    </Button>
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                    title={t('delete')}
                >
                    <Icons.Trash size={16} />
                </Button>
            </div>
        </div>
    );
}

export function ShoppingCartView() {
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, rtl } = useLanguage();
    const { listId } = useParams();
    const listName = location.state?.listName || 'Shopping List';

    const [items, setItems] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const nameInputRef = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (listId) {
            fetchItems();
        }
    }, [listId]);

    useEffect(() => {
        if (!isDialogOpen) {
            setEditingItem(null);
            setItemName('');
            setQuantity(1);
            setNote('');
            setSuggestions([]);
        }
    }, [isDialogOpen]);

    const fetchItems = async () => {
        setFetching(true);
        try {
            const res = await apiFetch(`/api/shopping-items?list_id=${listId}`);
            if (res.ok) {
                const data = await res.json();
                data.sort((a, b) => (a.position || 0) - (b.position || 0));
                setItems(data);
            }
        } catch (err) {
            console.error("Failed to fetch items:", err);
        } finally {
            setFetching(false);
        }
    };

    const fetchSuggestions = async (name) => {
        if (!name || name.length < 1) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await apiFetch(`/api/shopping-items?list_id=${listId}&name=${encodeURIComponent(name)}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(data.length > 0);
            }
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
        }
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        setItemName(value);
        fetchSuggestions(value);
    };

    const handleSelectSuggestion = (suggestion) => {
        setItemName(suggestion);
        setShowSuggestions(false);
    };

    const handleSaveItem = async (e) => {
        if (e) e.preventDefault();
        if (!itemName.trim()) return;

        // Check if item already exists (only for new items, not edits)
        if (!editingItem) {
            const exists = items.some(item => 
                item.encrypted_name.toLowerCase() === itemName.trim().toLowerCase() &&
                item.status !== 'bought'
            );
            if (exists) {
                alert(t('itemAlreadyExists'));
                return;
            }
        }

        setLoading(true);
        try {
            if (editingItem) {
                await apiFetch(`/api/shopping-items?list_id=${listId}&id=${editingItem.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        encrypted_name: itemName.trim(),
                        quantity: parseInt(quantity) || 1,
                        note: note || null
                    })
                });
            } else {
                await apiFetch(`/api/shopping-items?list_id=${listId}`, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        encrypted_name: itemName.trim(),
                        quantity: parseInt(quantity) || 1
                    })
                });
            }
            await fetchItems();
            if (!editingItem) {
                setItemName('');
                setQuantity(1);
                setNote('');
            } else {
                setIsDialogOpen(false);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save item');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (item) => {
        setEditingItem(item);
        setItemName(item.encrypted_name || '');
        setQuantity(item.quantity || 1);
        setNote(item.note || '');
        setIsDialogOpen(true);
    };

    const handleStatusChange = async (id, status) => {
        try {
            await apiFetch(`/api/shopping-items?list_id=${listId}&id=${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            await fetchItems();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('confirmDeleteItem'))) return;
        try {
            await apiFetch(`/api/shopping-items?list_id=${listId}&id=${id}`, {
                method: 'DELETE'
            });
            await fetchItems();
        } catch (err) {
            console.error(err);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const res = await apiFetch(`/api/invites`, {
                method: 'POST',
                body: JSON.stringify({ list_id: listId, email: inviteEmail, list_type: 'shopping' })
            });
            if (res.ok) {
                alert('Invite sent!');
                setInviteEmail('');
                setIsInviting(false);
            } else {
                const data = await res.json();
                alert(data.error || 'User not found or already invited.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        const updatedItems = newItems.map((item, index) => ({
            ...item,
            position: index * 10
        }));
        setItems(updatedItems);

        try {
            await Promise.all(updatedItems.map((item) => {
                const origItem = items.find(orig => orig.id === item.id);
                if (origItem && origItem.position !== item.position) {
                    return apiFetch(`/api/shopping-items?list_id=${listId}&id=${item.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ position: item.position })
                    });
                }
                return Promise.resolve();
            }));
        } catch (err) {
            console.error("Reorder failed:", err);
            fetchItems();
        }
    };

    const pendingCount = items.filter(i => i.status !== 'bought').length;
    const boughtCount = items.filter(i => i.status === 'bought').length;

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
                                onClick={() => navigate('/dashboard')}
                                title={t('back')}
                            >
                                {rtl ? <Icons.ChevronRight size={24} /> : <Icons.ChevronLeft size={24} />}
                            </Button>
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Icons.ShoppingCart size={24} className="text-primary shrink-0" />
                                    {listName}
                                </CardTitle>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsInviting(!isInviting)}>
                                <Icons.UserPlus size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('share')}
                            </Button>
                            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                                <Icons.Add size={16} className={rtl ? 'ml-2' : 'mr-2'} /> {t('addItem')}
                            </Button>
                        </div>
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

                    {pendingCount > 0 && (
                        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3 text-sm">
                            <Icons.Cart size={18} />
                            <p className="font-semibold">{pendingCount} {t('itemsPending')}</p>
                        </div>
                    )}

                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
                            <Loader2 size={48} className="mb-4 animate-spin" />
                            <p>{t('loading')}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 border-2 border-dashed border-border rounded-xl">
                            <Icons.ShoppingCart size={64} className="mx-auto mb-4 opacity-10" />
                            <p className="text-muted-foreground">{t('noItems')}</p>
                            <Button variant="link" onClick={() => setIsDialogOpen(true)}>{t('addFirstItem')}</Button>
                        </div>
                    ) : (
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-2">
                                <SortableContext 
                                    items={items.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {items.map((item) => (
                                        <SortableItem 
                                            key={item.id} 
                                            item={item} 
                                            rtl={rtl} 
                                            t={t} 
                                            onStatusChange={handleStatusChange}
                                            onEdit={startEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </DndContext>
                    )}

                    {boughtCount > 0 && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Icons.Check size={14} className="text-green-500" />
                                {boughtCount} {t('itemsBought')}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md bg-card border-border shadow-2xl overflow-hidden p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 text-start border-b border-border bg-muted/20">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Icons.ShoppingCart size={24} className="text-primary" /> 
                            {editingItem ? t('editItem') : t('addItem')}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSaveItem}>
                        <div className="p-6 space-y-4 text-start">
                            <div className="space-y-2 relative">
                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('itemName')}</Label>
                                <Input
                                    ref={nameInputRef}
                                    required
                                    value={itemName}
                                    onChange={handleNameChange}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder={t('itemNamePlaceholder')}
                                    className="bg-background/50"
                                    autoComplete="off"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                        {suggestions.map((suggestion, idx) => (
                                            <div
                                                key={idx}
                                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                            >
                                                {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('quantity')}</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="bg-background/50"
                                    />
                                </div>
                            </div>

                            {editingItem && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('note')}</Label>
                                    <Input
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder={t('notePlaceholder')}
                                        className="bg-background/50"
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-2 bg-muted/10 border-t border-border gap-2">
                            <Button variant="ghost" type="button" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit" disabled={loading || !itemName.trim()} className="min-w-[120px]">
                                {loading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Check size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                {loading ? t('saving') : (editingItem ? t('save') : t('add'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
