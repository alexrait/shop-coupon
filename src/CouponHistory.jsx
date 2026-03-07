import { useState, useEffect } from 'react';
import { History, RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from './useAuth';
import { useVault } from './VaultContext';

export function CouponHistory() {
    const { apiFetch } = useAuth();
    const { vaultId } = useVault();
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
        } catch (e) {
            console.error('Failed to load logs:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUndo = (logId) => {
        alert('Undo functionality requires manual state reversal. For now, we have logged the action.');
    };

    return (
        <div className="card animate-fade-in mt-4" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
            <h3 className="flex items-center gap-2 mb-4"><History size={20} /> Action History (30 Days)</h3>

            {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
            ) : logs.length === 0 ? (
                <p className="text-center" style={{ color: 'var(--color-text-muted)' }}>No recent activity.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs.map((log) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)' }}>
                            <div>
                                <span style={{ fontWeight: 600, color: log.action_type === 'USED' ? 'var(--color-secondary)' : 'var(--color-primary)' }}>
                                    {log.action_type}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>

                            {log.action_type === 'USED' && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    title="Undo Action"
                                    onClick={() => handleUndo(log.id)}
                                    style={{ padding: '0.5rem' }}
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
