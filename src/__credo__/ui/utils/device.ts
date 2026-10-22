const mq = (query: string) => window.matchMedia(query).matches;

export const device = {
  isMobile: mq('(max-width: 768px)'),

  isTablet: mq('(min-width: 769px) and (max-width: 1024px)'),
  isDesktop: mq('(min-width: 1025px)'),

  isTouch: mq('(pointer: coarse)'),

  hasFinePointer: mq('(any-pointer: fine)'),
} as const;
