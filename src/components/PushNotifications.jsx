import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { useLanguage } from './LanguageContext';

export function usePushNotifications() {
    const { apiFetch } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSub = await registration.pushManager.getSubscription();
            setSubscription(existingSub);
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

            // Get VAPID public key (in production, this should come from your server)
            const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Save to backend
            await apiFetch('/api/push', {
                method: 'POST',
                body: JSON.stringify({ subscription: sub })
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
            if (subscription) {
                await subscription.unsubscribe();
                
                await apiFetch('/api/push', {
                    method: 'DELETE',
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });
                
                setSubscription(null);
            }
            return { success: true };
        } catch (err) {
            console.error('Error unsubscribing:', err);
            return { error: err.message };
        }
    };

    return { subscription, supported, subscribe, unsubscribe };
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
    const { t } = useLanguage();
    const { subscription, supported, subscribe, unsubscribe } = usePushNotifications();
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

    if (!supported) {
        return null;
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Icons.Bell size={18} className="text-primary" />
                    {t('pushNotifications')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {subscription ? t('notificationsEnabled') : t('notificationsDisabled')}
                    </p>
                    <Button 
                        size="sm" 
                        variant={subscription ? "outline" : "default"}
                        onClick={handleToggle}
                        disabled={loading}
                    >
                        {loading ? '...' : (subscription ? t('disable') : t('enable'))}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
