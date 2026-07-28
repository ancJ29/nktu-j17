import { useLayoutEffect, useRef } from 'react';
import { device } from '@credo/base-ui/utils';

const isMobile = device.isMobile;

const scrollPositions = new Map<string, number>();

const MAX_RESTORE_FRAMES = 60;

const maxScrollTop = (el: HTMLElement) => el.scrollHeight - el.clientHeight;

export function useListScrollRestoration(key: string) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const pageEl = document.scrollingElement as HTMLElement | null;

    const targets: Array<{ el: HTMLElement; evt: Window | HTMLElement }> = [];
    if (!isMobile && viewportRef.current) {
      targets.push({ el: viewportRef.current, evt: viewportRef.current });
    }
    if (pageEl) targets.push({ el: pageEl, evt: window });
    if (targets.length === 0) return;

    let captureFrame = 0;
    const capture = () => {
      let top = 0;
      for (const { el } of targets) top = Math.max(top, el.scrollTop);
      scrollPositions.set(key, top);
    };
    const onScroll = () => {
      if (captureFrame) return;
      captureFrame = requestAnimationFrame(() => {
        captureFrame = 0;
        capture();
      });
    };
    for (const { evt } of targets) evt.addEventListener('scroll', onScroll, { passive: true });

    let restoreFrame = 0;
    const saved = scrollPositions.get(key);
    if (saved && saved > 0) {
      let attempts = 0;
      const landOffset = () => {
        for (const { el } of targets) {
          el.scrollTop = Math.min(saved, Math.max(0, maxScrollTop(el)));
        }
      };
      const tick = () => {
        const canHonor = targets.some(({ el }) => maxScrollTop(el) >= saved - 1);
        if (canHonor || attempts >= MAX_RESTORE_FRAMES) {
          landOffset();
          restoreFrame = 0;
          return;
        }

        attempts += 1;
        restoreFrame = requestAnimationFrame(tick);
      };

      tick();
    }

    return () => {
      for (const { evt } of targets) evt.removeEventListener('scroll', onScroll);
      if (captureFrame) cancelAnimationFrame(captureFrame);
      if (restoreFrame) cancelAnimationFrame(restoreFrame);
      // Deliberately NO capture() here. The throttled scroll handler is the
      // source of truth for the saved offset. Capturing on unmount would clobber
      // it under StrictMode: the dev mount→cleanup→mount cycle runs this cleanup
      // before the restore rAF fires, so `scrollTop` is still 0 and we'd
      // overwrite the good value with 0 — restoration then reads 0 and no-ops.
    };
  }, [key]);

  return viewportRef;
}
