import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global capture so the event is NEVER missed if Chrome fires it before React mounts
declare global {
  interface Window {
    __KMS_PWA_PROMPT__?: BeforeInstallPromptEvent | null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    window.__KMS_PWA_PROMPT__ = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('kms-pwa-ready'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return typeof window !== 'undefined' ? window.__KMS_PWA_PROMPT__ || null : null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed as PWA)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://'));
    setIsInstalled(!!isStandalone);

    // Detect user agent specifics
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Detect in-app browsers (WhatsApp, Instagram, FB, Messenger) where PWA install is blocked
    const inApp = /fban|fbav|instagram|whatsapp|line|micromessenger|telegram|snapchat/.test(ua);
    setIsInAppBrowser(inApp);

    // If global prompt was already caught
    if (window.__KMS_PWA_PROMPT__) {
      setDeferredPrompt(window.__KMS_PWA_PROMPT__);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      window.__KMS_PWA_PROMPT__ = p;
      setDeferredPrompt(p);
    };

    const handleCustomReady = () => {
      if (window.__KMS_PWA_PROMPT__) {
        setDeferredPrompt(window.__KMS_PWA_PROMPT__);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__KMS_PWA_PROMPT__ = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('kms-pwa-ready', handleCustomReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('kms-pwa-ready', handleCustomReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__KMS_PWA_PROMPT__ : null);
    if (!promptEvent) {
      return false;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__KMS_PWA_PROMPT__ = null;
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.__KMS_PWA_PROMPT__)),
    isInstalled,
    isIOS,
    isInAppBrowser,
    install,
  };
}
