
import type { CSSProperties } from 'react';

export const FLOATING_PANEL_STYLE: CSSProperties = {
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  maxWidth: 400,
  width: 'calc(100% - 40px)',
};

export const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

export const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

export const isIOS = () => /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
export const isMacOS = () => /macintosh|mac os x/.test(navigator.userAgent.toLowerCase());
