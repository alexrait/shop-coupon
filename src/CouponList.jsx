import { useState, useRef, useEffect } from 'react';
import { Package, Tag, Clock, Image as ImageIcon, UserPlus, X, Loader2 } from 'lucide-react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';
import { useAuth } from './useAuth';

export function CouponList() {
    const { privateKey, publicKey, vaultId, vaultName } = useVault();
    const { apiFetch } = useAuth();
    const [coupons, setCoupons] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Coupon Form State
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
    }, [vaultId]);

    const fetchCoupons = async () => {
        setFetching(true);
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}`);
            if (res.ok) {
                const data = await res.json();

                // Decrypt coupons
                const decrypted = await Promise.all(data.map(async (encrypted) => {
                    try {
                        const payloadStr = await cryptoUtils.decryptRSA(encrypted.encrypted_payload, privateKey);
                        const payload = JSON.parse(payloadStr);
                        return { ...payload, id: encrypted.id, created_at: encrypted.created_at };
                    } catch (err) {
                        console.error("Failed to decrypt coupon:", err);
                        return { title: "[Decryption Failed]", id: encrypted.id };
                    }
                }));

                setCoupons(decrypted);
            }
        } catch (err) {
            console.error("Failed to fetch coupons:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        if (!publicKey) return alert("No active vault keys found.");

        setLoading(true);
        try {
            const payload = { title, code, value, imageBase64 };
            const payloadString = JSON.stringify(payload);

            // 1. Encrypt directly with RSA for now (if payload is small)
            // Note: Hybrid encryption is better for large payloads, but let's stick to the simplest working path
            const encryptedPayload = await cryptoUtils.encryptRSA(payloadString, publicKey);

            const res = await apiFetch(`/api/coupons?list_id=${vaultId}`, {
                method: 'POST',
                body: JSON.stringify({ encrypted_payload: encryptedPayload })
            });

            if (res.ok) {
                await fetchCoupons();
                setIsAdding(false);
                setTitle(''); setCode(''); setValue(''); setImageBase64('');
            } else {
                alert("Failed to save coupon to server");
            }
        } catch (err) {
            console.error(err);
            alert('Encryption failed. (Maybe image is too large for RSA?)');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const res = await apiFetch('/api/invites', {
                method: 'POST',
                body: JSON.stringify({ list_id: vaultId, email: inviteEmail })
            });

            if (res.ok) {
                alert(`Invite sent to ${inviteEmail}! Remember to share the vault password with them securely.`);
                setInviteEmail('');
                setIsInviting(false);
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to invite user");
            }
        } catch (err) {
            console.error(err);
            alert("Invite failed");
        } finally {
            setInviteLoading(false);
        }
    };

    const markUsed = async (id) => {
        if (!confirm("Are you sure you want to mark this coupon as used?")) return;
        try {
            const res = await apiFetch(`/api/coupons?list_id=${vaultId}&id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchCoupons();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="card animate-fade-in mt-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="flex items-center gap-2" style={{ margin: 0 }}><Tag size={20} /> {vaultName}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Vault ID: {vaultId}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary flex items-center gap-2" onClick={() => setIsInviting(!isInviting)}>
                        <UserPlus size={18} /> Invite
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>Add Coupon</button>
                </div>
            </div>

            {isInviting && (
                <form onSubmit={handleInvite} className="card animate-fade-in" style={{ background: 'var(--color-secondary-mix)', marginBottom: '1rem' }}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 style={{ margin: 0 }}>Invite Member</h4>
                        <X size={18} style={{ cursor: 'pointer' }} onClick={() => setIsInviting(false)} />
                    </div>
                    <div className="form-group">
                        <input type="email" className="form-input" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="User's Gmail address..." />
                    </div>
                    <button type="submit" className="btn btn-primary w-full" disabled={inviteLoading}>
                        {inviteLoading ? 'Sending...' : 'Add Member to Vault'}
                    </button>
                </form>
            )}

            {isAdding && (
                <form onSubmit={handleSaveCoupon} className="card" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '1rem' }}>
                    <h4 className="flex items-center gap-2"><Package size={16} /> New Secured Coupon</h4>

                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input type="text" className="form-input" required value={title} onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Code / Barcode Value</label>
                        <input type="text" className="form-input" value={code} onChange={e => setCode(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Monetary Value / Discount</label>
                        <input type="text" className="form-input" value={value} onChange={e => setValue(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2"><ImageIcon size={16} /> Image Attachment</label>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="form-input" />
                        {imageBase64 && (
                            <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                                <img src={imageBase64} alt="Preview" style={{ maxWidth: '100px', borderRadius: '4px' }} />
                                <X size={14} style={{ position: 'absolute', top: -5, right: -5, background: 'var(--color-bg)', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setImageBase64('')} />
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary mt-2" disabled={loading || !title}>
                        {loading ? 'Encrypting & Saving...' : 'Save Securely'}
                    </button>
                </form>
            )}

            {fetching ? (
                <div className="flex flex-col items-center py-8 text-muted">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p>Decrypting vault content...</p>
                </div>
            ) : coupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No coupons in this vault yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {coupons.map((c) => (
                        <div key={c.id} className="card coupon-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0 }}>{c.title}</h4>
                                {c.code && <code className="block mt-1" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{c.code}</code>}
                                {c.value && <p style={{ margin: '0.25rem 0 0', fontWeight: 'bold' }}>{c.value}</p>}
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', opacity: 0.5 }}>Added {new Date(c.created_at).toLocaleDateString()}</p>
                            </div>

                            {c.imageBase64 && (
                                <img src={c.imageBase64} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '4px', margin: '0 1rem' }} />
                            )}
                            <button className="btn btn-secondary btn-sm" title="Mark Used" onClick={() => markUsed(c.id)}>
                                <Clock size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
