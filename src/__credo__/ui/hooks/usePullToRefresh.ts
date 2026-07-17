import { useEffect, useRef, useState } from 'react';

type UsePullToRefreshOptions = {
  
  onRefresh: () => void | Promise<void>;
  
  enabled?: boolean;
  
  threshold?: number;
  
  maxPull?: number;
  
  resistance?: number;
};

type UsePullToRefreshState = {
  
  pullDistance: number;
  
  isRefreshing: boolean;
  
  isPulling: boolean;
};

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 70,
  maxPull = 120,
  resistance = 0.5,
}: UsePullToRefreshOptions): UsePullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

    let startY: number | null = null;
    let distance = 0;
    let pulling = false;
    let refreshing = false;
    let rafId: number | null = null;

    const atTop = () =>
      (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0;

    const flush = () => {
      rafId = null;
      setPullDistance(distance);
    };
    const schedule = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(flush);
    };

    const reset = () => {
      startY = null;
      distance = 0;
      pulling = false;
      window.removeEventListener('touchmove', onTouchMove);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      setPullDistance(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY == null || refreshing) return;
      const dy = e.touches[0].clientY - startY;

      
      
      if (dy <= 0 || !atTop()) {
        if (pulling) {
          distance = 0;
          pulling = false;
          schedule();
        }
        if (!atTop()) startY = null;
        return;
      }

      pulling = true;
      
      if (e.cancelable) e.preventDefault();
      distance = Math.min(maxPull, dy * resistance);
      schedule();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || e.touches.length !== 1 || !atTop()) return;
      startY = e.touches[0].clientY;
      distance = 0;
      pulling = false;
      
      window.addEventListener('touchmove', onTouchMove, { passive: false });
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      if (startY == null) return;

      if (pulling && distance >= threshold) {
        refreshing = true;
        startY = null;
        pulling = false;
        distance = threshold; 
        setIsRefreshing(true);
        setPullDistance(threshold);
        Promise.resolve()
          .then(() => onRefreshRef.current())
          .catch(() => {})
          .finally(() => {
            
            
            refreshing = false;
            setIsRefreshing(false);
            reset();
          });
      } else {
        reset();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);
      window.removeEventListener('touchmove', onTouchMove);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [enabled, threshold, maxPull, resistance]);

  return { pullDistance, isRefreshing, isPulling: pullDistance > 0 };
}

export type { UsePullToRefreshOptions, UsePullToRefreshState };
