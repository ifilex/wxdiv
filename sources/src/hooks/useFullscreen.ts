import { useState, useEffect, useCallback } from "react";

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function useFullscreen() {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  useEffect(() => {
    const updateNativeState = () => {
      const doc = document as FullscreenDocument;
      const active = Boolean(
        document.fullscreenElement || doc.webkitFullscreenElement
      );
      setIsNativeFullscreen(active);
      if (active) {
        setIsImmersive(true);
      }
    };

    updateNativeState();
    document.addEventListener("fullscreenchange", updateNativeState);
    document.addEventListener("webkitfullscreenchange", updateNativeState);
    return () => {
      document.removeEventListener("fullscreenchange", updateNativeState);
      document.removeEventListener("webkitfullscreenchange", updateNativeState);
    };
  }, []);

  const enterFullscreen = useCallback(async (target?: HTMLElement | null) => {
    setIsImmersive(true);
    const el = (target || document.documentElement) as FullscreenElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
        return true;
      }
      if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return true;
      }
    } catch {
      // In iframes or iOS Safari native Fullscreen API may be blocked;
      // software immersive mode remains active seamlessly.
    }
    return false;
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsImmersive(false);
    const doc = document as FullscreenDocument;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit errors
    }
  }, []);

  const toggleFullscreen = useCallback(
    async (target?: HTMLElement | null) => {
      if (isImmersive || isNativeFullscreen) {
        await exitFullscreen();
      } else {
        await enterFullscreen(target);
      }
    },
    [isImmersive, isNativeFullscreen, enterFullscreen, exitFullscreen]
  );

  return {
    isFullscreen: isImmersive || isNativeFullscreen,
    isNativeFullscreen,
    isImmersive,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
