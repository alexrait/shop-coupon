import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export function ActivityPage() {
    const { apiFetch } = useAuth();
    const { t, rtl } = useLanguage();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/logs`);
            if (res.ok) {
                const data = await res.json();
                // Decrypt coupon titles if available
                const decrypted = await Promise.all(data.map(async (log) => {
                    if (log.coupon_id && log.action_details) {
                        try {
                            const details = typeof log.action_details === 'string' 
                                ? JSON.parse(log.action_details) 
                                : log.action_details;
                            return { ...log, coupon_title: details.title || '...' };
                        } catch {
                            return { ...log, coupon_title: '...' };
                        }
                    }
                    return { ...log, coupon_title: log.note || 'Shopping item' };
                }));
                setLogs(decrypted);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (actionType) => {
        switch (actionType) {
            case 'USED':
            case 'BOUGHT':
                return <Icons.Check size={10} className="text-green-500" />;
            case 'DELETED':
                return <Icons.Trash size={10} className="text-destructive" />;
            default:
                return <Icons.Add size={10} className="text-primary" />;
        }
    };

    const getActionText = (actionType, listType) => {
        if (listType === 'shopping') {
            switch (actionType) {
                case 'BOUGHT': return t('itemBought');
                case 'DELETED': return t('itemDeleted');
                default: return t('itemAdded');
            }
        }
        switch (actionType) {
            case 'USED': return t('couponMarkedUsed');
            case 'DELETED': return t('couponDeleted');
            default: return t('newCouponAdded');
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 animate-in fade-in duration-700">
            <Card className="bg-card border-border shadow-md">
                <CardHeader className="text-start border-b border-border/40 pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Icons.History className="text-primary" /> {t('activityFeed')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-200px)] px-6">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-primary opacity-50" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground italic text-sm">
                                {t('noActivity')}
                            </div>
                        ) : (
                            <div className="space-y-6 py-4">
                                {logs.map((log, i) => (
                                    <div key={log.id} className="relative">
                                        {i !== logs.length - 1 && (
                                            <div className={`absolute ${rtl ? 'right-[11px]' : 'left-[11px]'} top-6 w-[2px] h-full bg-border/40`} />
                                        )}
                                        <div className={`flex gap-4 ${rtl ? 'flex-row-reverse' : ''}`}>
                                            <div className="relative z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center border-4 border-background shrink-0">
                                                {getActionIcon(log.action_type)}
                                            </div>
                                            <div className={`flex-1 min-w-0 ${rtl ? 'text-right' : 'text-left'}`}>
                                                <p className="text-sm font-medium leading-none mb-1">
                                                    {getActionText(log.action_type, log.list_type)}
                                                </p>
                                                {log.list_name && (
                                                    <p className="text-xs text-muted-foreground">
                                                        <span className="font-semibold">{log.list_type === 'shopping' ? '🛒' : '🔐'}</span> {log.list_name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground truncate italic">
                                                    {log.coupon_title || "..."}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                                                    {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
