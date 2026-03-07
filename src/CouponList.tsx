import { useState, useRef } from 'react';
import { Package, Tag, Clock, Image as ImageIcon } from 'lucide-react';
import { cryptoUtils } from './lib/crypto';
import { useVault } from './VaultContext';

export function CouponList() {
    const { privateKey, publicKey } = useVault();
    const [coupons, setCoupons] = useState<any[]>([]); // Mock state
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    // Coupon Form State
    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [value, setValue] = useState('');
    const [imageBase64, setImageBase64] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) return alert("No active vault keys found.");

        setLoading(true);
        try {
            // 1. Prepare Payload
            const payload = {
                title,
                code,
                value,
                imageBase64
            };

            const payloadString = JSON.stringify(payload);

            // 2. Generate Random AES Key for this coupon (Hybrid Encryption)
            // Because RSA can't encrypt large base64 strings directly
            const aesKey = await cryptoUtils.generateAESKey();

            // 3. Encrypt payload with AES
            const { cipher: encryptedPayload, iv } = await cryptoUtils.encryptAES(payloadString, aesKey);

            // 4. Export the AES Key
            const exportedAes = await cryptoUtils.exportAESKey(aesKey);

            // 5. Encrypt the exported AES key with the Vault's RSA Public Key
            const encryptedAesKey = await cryptoUtils.encryptRSA(exportedAes, publicKey);

            // TODO: POST to server API
            console.log("Saving Encrypted Data...", {
                encrypted_payload: encryptedPayload,
                iv,
                encrypted_aes_key: encryptedAesKey
            });

            // Mock local addition
            setCoupons([...coupons, { ...payload, id: Date.now() }]);
            setIsAdding(false);
            setTitle(''); setCode(''); setValue(''); setImageBase64('');
        } catch (err) {
            console.error(err);
            alert('Encryption failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card animate-fade-in mt-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2"><Tag size={20} /> Vault Coupons</h3>
                <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>Add Coupon</button>
            </div>

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
                            <img src={imageBase64} alt="Preview" style={{ maxWidth: '100px', marginTop: '0.5rem', borderRadius: '4px' }} />
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary mt-2" disabled={loading || !title}>
                        {loading ? 'Encrypting Local...' : 'Save Securely'}
                    </button>
                </form>
            )}

            {/* List */}
            {coupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No coupons in this vault yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {coupons.map((c) => (
                        <div key={c.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: 0 }}>{c.title}</h4>
                                {c.code && <code style={{ color: 'var(--color-secondary)' }}>{c.code}</code>}
                                {c.value && <p style={{ margin: 0, fontSize: '0.875rem' }}>Value: {c.value}</p>}
                            </div>

                            {c.imageBase64 && (
                                <img src={c.imageBase64} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                            )}
                            <button className="btn btn-secondary btn-sm" title="Mark Used"><Clock size={16} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
