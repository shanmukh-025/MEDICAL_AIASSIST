import React, { useState, useEffect } from 'react';
import { Bell, X, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import usePushNotifications from '../hooks/usePushNotifications';

/**
 * Global push notification banner — shown once when user is logged in
 * but hasn't enabled push notifications yet.
 */
const PushNotificationPrompt = () => {
    const { user } = useAuth();
    const { isSupported, isSubscribed, permission, requestPermissionAndSubscribe } = usePushNotifications();
    const [dismissed, setDismissed] = useState(false);
    const [enabling, setEnabling] = useState(false);

    // Check localStorage to see if user has already dismissed the prompt
    useEffect(() => {
        const wasDismissed = localStorage.getItem('pushPromptDismissed');
        if (wasDismissed) setDismissed(true);
    }, []);

    // Don't show if: not supported, already subscribed, not logged in, dismissed, or denied
    if (!isSupported || isSubscribed || !user || dismissed || permission === 'denied') {
        return null;
    }

    // Don't show on login/register pages
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        return null;
    }

    const handleEnable = async () => {
        setEnabling(true);
        const success = await requestPermissionAndSubscribe();
        setEnabling(false);
        if (success) {
            setDismissed(true);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('pushPromptDismissed', 'true');
    };

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 text-white">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
                        <BellRing className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Enable Notifications</p>
                        <p className="text-xs text-indigo-100 mt-0.5">
                            Get medicine reminders, queue updates & appointment alerts even when the app is closed.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleEnable}
                                disabled={enabling}
                                className="flex items-center gap-1.5 bg-white text-indigo-700 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                {enabling ? 'Enabling...' : 'Enable Now'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="text-xs text-indigo-200 hover:text-white px-3 py-2 transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slide-up {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
        </div>
    );
};

export default PushNotificationPrompt;
