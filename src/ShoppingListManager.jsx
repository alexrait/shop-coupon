import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export function ShoppingListManager() {
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const { t, rtl } = useLanguage();

    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [listName, setListName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/shopping-lists');
            if (res.ok) {
                const data = await res.json();
                setLists(data);
            }
        } catch (e) {
            console.error('Failed to load shopping lists:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleListClick = (list) => {
        navigate(`/shopping-list/${list.id}`, { state: { listName: list.name } });
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await apiFetch('/api/shopping-lists', {
                method: 'POST',
                body: JSON.stringify({ name: listName })
            });

            if (!res.ok) throw new Error('Failed to create list');

            const newList = await res.json();
            setLists([newList, ...lists]);
            setIsCreating(false);
            setListName('');
            handleListClick(newList);

        } catch (err) {
            console.error(err);
            alert('Failed to create shopping list.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteList = async (e, listId) => {
        e.stopPropagation();
        if (!confirm(t('confirmDeleteList'))) return;

        try {
            const res = await apiFetch(`/api/shopping-lists?list_id=${listId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setLists(lists.filter(l => l.id !== listId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                    <Icons.ShoppingCart className="text-primary" /> {t('shoppingLists')}
                </h3>
                <Button
                    size="sm"
                    onClick={() => setIsCreating(!isCreating)}
                >
                    <Icons.Add size={16} className={rtl ? 'ml-1' : 'mr-1'} /> {t('newShoppingList')}
                </Button>
            </div>

            {isCreating && (
                <Card className="border-border bg-muted/30 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Icons.ShoppingCart size={20} className="text-primary" /> {t('createShoppingList')}
                        </CardTitle>
                    </CardHeader>
                    <form onSubmit={handleCreateList}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="listName">{t('listName')}</Label>
                                <Input
                                    id="listName"
                                    required
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    placeholder={t('listNamePlaceholder')}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={actionLoading || !listName}>
                                {actionLoading ? <Loader2 className="animate-spin mr-2 ml-2" /> : <Icons.Add size={18} className={rtl ? 'ml-2' : 'mr-2'} />}
                                {t('create')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>{t('cancel')}</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            ) : lists.length === 0 ? (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Icons.ShoppingCart size={48} className="mb-4 opacity-20" />
                        <p>{t('noShoppingLists')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {lists.map((list) => (
                        <div
                            key={list.id}
                            className="group/item flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-all hover:bg-muted/30 shadow-sm cursor-pointer"
                            onClick={() => handleListClick(list)}
                        >
                            <div className="p-1 text-muted-foreground">
                                <Icons.ShoppingCart size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{list.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(list.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => handleDeleteList(e, list.id)}
                                    title={t('delete')}
                                >
                                    <Icons.Trash size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
