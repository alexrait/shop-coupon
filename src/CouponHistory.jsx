import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';

export function CouponHistory() {
    const [logs] = useState([
        { id: '1', action_type: 'USED', coupon_title_preview: '15% Off BestBuy', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { id: '2', action_type: 'CREATED', coupon_title_preview: 'Amazon $10', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    ]);

    const handleUndo = (logId) => {
        alert(`Undoing action for log ${logId}`);
    };

    return (
        <div className="card animate-fade-in mt-4" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
            <h3 className="flex items-center gap-2 mb-4"><History size={20} /> Action History (30 Days)</h3>

            {logs.length === 0 ? (
                <p className="text-center" style={{ color: 'var(--color-text-muted)' }}>No recent activity.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs.map((log) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)' }}>
                            <div>
                                <span style={{ fontWeight: 600, color: log.action_type === 'USED' ? 'var(--color-secondary)' : 'var(--color-text)' }}>
                                    {log.action_type}
                                </span>: {log.coupon_title_preview}
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>

                            <button
                                className="btn btn-secondary btn-sm"
                                title="Undo Action"
                                onClick={() => handleUndo(log.id)}
                                style={{ padding: '0.5rem' }}
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
