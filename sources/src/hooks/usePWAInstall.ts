import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PlatformType = 'android' | 'ios' | 'desktop';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const requestPersistentStorage = () => {
      try {
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
          navigator.storage.persist().catch(() => {});
        }
      } catch {
        // Ignore storage persistence errors
      }
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

    const checkStandalone = () => {
      const standaloneMatch = standaloneQuery.matches || fullscreenQuery.matches;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const installed = standaloneMatch || iosStandalone;
      setIsInstalled(installed);
      if (installed) {
        requestPersistentStorage();
      }
    };

    checkStandalone();
    requestPersistentStorage();

    const handleMediaChange = () => checkStandalone();
    standaloneQuery.addEventListener?.('change', handleMediaChange);
    fullscreenQuery.addEventListener?.('change', handleMediaChange);

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const androidDevice = /android/.test(ua);

    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      requestPersistentStorage();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener?.('change', handleMediaChange);
      fullscreenQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          if (navigator.storage && typeof navigator.storage.persist === 'function') {
            navigator.storage.persist().catch(() => {});
          }
        } catch {
          // Ignore storage persistence errors
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const detectedPlatform: PlatformType = isIOS
    ? 'ios'
    : isAndroid
      ? 'android'
      : 'desktop';

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    detectedPlatform,
    install,
  };
}
