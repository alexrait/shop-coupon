import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from './ui/button';
import { Icons } from './icons';

export function PrivacyModal({ onClose }) {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-primary/20 p-8 shadow-2xl relative">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
                    <Icons.Logout size={20} />
                </Button>
                <h2 className="text-2xl font-bold mb-6">{t('privacy')}</h2>
                <div className="prose prose-invert max-w-none text-muted-foreground space-y-4">
                    <p>At Vault Cart, your privacy is literally built into the code. We do not store your passwords, private keys, or plain-text coupon data on our servers.</p>
                    <h3 className="text-foreground font-semibold mt-4">1. Data Encryption</h3>
                    <p>All sensitive information is encrypted in your browser using standardized Web Crypto APIs before being sent to our backend. We only host the encrypted blobs.</p>
                    <h3 className="text-foreground font-semibold mt-4">2. Authentication</h3>
                    <p>We use Netlify Identity to verify your email. We do not sell your personal information to third parties.</p>
                    <h3 className="text-foreground font-semibold mt-4">3. Local Storage</h3>
                    <p>We may store your language preference and session tokens in your browser's local storage.</p>
                </div>
            </div>
        </div>
    );
}

export function TermsModal({ onClose }) {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-primary/20 p-8 shadow-2xl relative">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
                    <Icons.Logout size={20} />
                </Button>
                <h2 className="text-2xl font-bold mb-6">{t('terms')}</h2>
                <div className="prose prose-invert max-w-none text-muted-foreground space-y-4">
                    <p>By using Vault Cart, you agree to the following terms:</p>
                    <h3 className="text-foreground font-semibold mt-4">1. Security Responsibility</h3>
                    <p>You are solely responsible for remembering your vault passwords. If you lose your password, there is NO recovery mechanism, and your data will be permanently inaccessible.</p>
                    <h3 className="text-foreground font-semibold mt-4">2. Proper Use</h3>
                    <p>You agree not to use this service for storing illegal materials or malicious data.</p>
                    <h3 className="text-foreground font-semibold mt-4">3. No Warranty</h3>
                    <p>Vault Cart is provided "as is" without any warranties of any kind.</p>
                </div>
            </div>
        </div>
    );
}
