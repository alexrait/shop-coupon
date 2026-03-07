import { useState, useEffect } from 'react';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Badge } from './components/ui/badge';
import { Loader2 } from 'lucide-react';

export function CouponHistory() {
    const { vaultId } = useVault();
    const { apiFetch } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (vaultId) {
            fetchLogs();
        }
    }, [vaultId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/logs?list_id=${vaultId}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-full bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Icons.History className="text-primary" /> Activity Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px] px-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-primary opacity-50" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground italic text-sm">
                            No recent activity in this vault.
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            {logs.map((log, i) => (
                                <div key={log.id} className="relative">
                                    {i !== logs.length - 1 && (
                                        <div className="absolute left-[11px] top-6 w-[2px] h-full bg-border/40" />
                                    )}
                                    <div className="flex gap-4">
                                        <div className="relative z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center border-4 border-background shrink-0">
                                            {log.action_type === 'DELETE' ? (
                                                <Icons.Check size={10} className="text-primary" />
                                            ) : (
                                                <Icons.Add size={10} className="text-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none mb-1">
                                                {log.action_type === 'DELETE' ? 'Coupon marked used' : 'New coupon added'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate italic">
                                                {log.coupon_title || "Untitled Coupon"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                                                {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                                            </p>

                                            {log.action_type === 'DELETE' && (
                                                <Badge variant="outline" className="mt-2 text-[10px] h-5 border-primary/20 bg-primary/5 text-primary">
                                                    Undo Available (30d)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
