import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user hasn't dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Download size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install MediAssist</h3>
            <p className="text-sm text-emerald-50 mb-3">
              Install our app for offline access and faster performance in rural areas
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-50 transition"
              >
                Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="bg-emerald-800/50 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-800 transition"
              >
                Maybe Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
