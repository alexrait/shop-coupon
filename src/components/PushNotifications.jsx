import { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { Icons } from './icons';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useLanguage } from '../LanguageContext';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

export function usePushNotifications() {
    const { apiFetch } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [settings, setSettings] = useState({ newItem: true, removeItem: true, updateItem: true });
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const res = await apiFetch('/api/push');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setSubscription(data.subscription);
                    setSettings(data.settings || { newItem: true, removeItem: true, updateItem: true });
                }
            }
        } catch (err) {
            console.error('Error checking subscription:', err);
        }
    };

    const subscribe = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return { error: 'Permission denied' };
            }

            // Get VAPID public key
            const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Save to backend
            await apiFetch('/api/push', {
                method: 'POST',
                body: JSON.stringify({ subscription: sub, settings })
            });

            setSubscription(sub);
            return { success: true };
        } catch (err) {
            console.error('Error subscribing:', err);
            return { error: err.message };
        }
    };

    const unsubscribe = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                
                await apiFetch('/api/push', {
                    method: 'DELETE',
                    body: JSON.stringify({ endpoint: sub.endpoint })
                });
                
                setSubscription(null);
            }
            return { success: true };
        } catch (err) {
            console.error('Error unsubscribing:', err);
            return { error: err.message };
        }
    };

    const updateSettings = async (newSettings) => {
        setSettings(newSettings);
        if (subscription) {
            await apiFetch('/api/push', {
                method: 'POST',
                body: JSON.stringify({ settings: newSettings })
            });
        }
    };

    return { subscription, settings, supported, subscribe, unsubscribe, updateSettings };
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function NotificationSettings() {
    const { t, rtl } = useLanguage();
    const { subscription, settings, supported, subscribe, unsubscribe, updateSettings } = usePushNotifications();
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        setLoading(true);
        if (subscription) {
            await unsubscribe();
        } else {
            await subscribe();
        }
        setLoading(false);
    };

    const handleSettingChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        updateSettings(newSettings);
    };

    if (!supported) {
        return null;
    }

    return (
        <Card className="bg-card border-border shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icons.Bell size={20} className="text-primary" />
                    {t('pushNotifications')}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold">
                            {subscription ? t('notificationsEnabled') : t('notificationsDisabled')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {subscription ? 'You are receiving notifications' : 'Turn on to stay updated'}
                        </p>
                    </div>
                    <Button 
                        size="sm" 
                        variant={subscription ? "outline" : "default"}
                        onClick={handleToggle}
                        disabled={loading}
                        className="rounded-full px-6"
                    >
                        {loading ? '...' : (subscription ? t('disable') : t('enable'))}
                    </Button>
                </div>

                {subscription && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Preferences</h4>
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/50">
                                <Label htmlFor="newItem" className="flex-1 cursor-pointer font-medium">{t('notifyNewItem')}</Label>
                                <Checkbox 
                                    id="newItem" 
                                    checked={settings.newItem} 
                                    onCheckedChange={(checked) => handleSettingChange('newItem', checked)} 
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/50">
                                <Label htmlFor="removeItem" className="flex-1 cursor-pointer font-medium">{t('notifyRemoveItem')}</Label>
                                <Checkbox 
                                    id="removeItem" 
                                    checked={settings.removeItem} 
                                    onCheckedChange={(checked) => handleSettingChange('removeItem', checked)} 
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/50">
                                <Label htmlFor="updateItem" className="flex-1 cursor-pointer font-medium">{t('notifyUpdateItem')}</Label>
                                <Checkbox 
                                    id="updateItem" 
                                    checked={settings.updateItem} 
                                    onCheckedChange={(checked) => handleSettingChange('updateItem', checked)} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
