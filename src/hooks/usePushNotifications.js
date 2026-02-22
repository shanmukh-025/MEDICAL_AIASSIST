import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/**
 * Hook to manage push notifications globally.
 */
export const usePushNotifications = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState('default');

    // Check if push is supported
    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setIsSupported(supported);
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    // Define subscribeToPush before using it in useEffect
    const subscribeToPush = useCallback(async (authToken) => {
        try {
            const token = authToken || localStorage.getItem('token');
            if (!token) return false;

            const registration = await navigator.serviceWorker.ready;

            let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                try {
                    const res = await axios.get(`${API_URL}/api/notifications/vapid-key`);
                    vapidKey = res.data?.publicKey;
                } catch (e) {
                    console.warn('Could not fetch VAPID key from server');
                }
            }

            if (!vapidKey) {
                console.warn('No VAPID key available - push notifications disabled');
                return false;
            }

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
            };

            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });
            }

            await axios.post(
                `${API_URL}/api/notifications/subscribe`,
                { subscription: subscription.toJSON() },
                { headers: { 'x-auth-token': token } }
            );

            setIsSubscribed(true);
            console.log('🔔 Push notifications subscribed');
            return true;
        } catch (err) {
            console.error('Push subscription failed:', err);
            return false;
        }
    }, []);

    // Auto-subscribe if user is logged in and permission is already granted
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (isSupported && token && Notification.permission === 'granted') {
            subscribeToPush(token);
        }
    }, [isSupported, subscribeToPush]);

    const requestPermissionAndSubscribe = useCallback(async () => {
        if (!isSupported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                return await subscribeToPush();
            }
            return false;
        } catch (err) {
            console.error('Permission request failed:', err);
            return false;
        }
    }, [isSupported, subscribeToPush]);

    const unsubscribe = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            if (token) {
                await axios.post(
                    `${API_URL}/api/notifications/unsubscribe`,
                    {},
                    { headers: { 'x-auth-token': token } }
                );
            }

            setIsSubscribed(false);
            return true;
        } catch (err) {
            console.error('Unsubscribe failed:', err);
            return false;
        }
    }, []);

    return {
        isSupported,
        isSubscribed,
        permission,
        requestPermissionAndSubscribe,
        unsubscribe,
        subscribeToPush
    };
};

export default usePushNotifications;

