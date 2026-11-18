/**
 * Whether the browser is an iPad, and whether the page runs as a Home Screen
 * app.
 *
 * iPadOS Safari reports itself as a Mac, so a Mac user agent that also takes
 * touch is an iPad; a real Mac reports 0 touch points. The result is a claim
 * made by the browser, not a security boundary.
 */

export function detectIPad(userAgent: string, maxTouchPoints: number): boolean {
  if (userAgent.includes('iPad')) return true;
  return userAgent.includes('Macintosh') && maxTouchPoints > 0;
}

export function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  return detectIPad(navigator.userAgent ?? '', navigator.maxTouchPoints ?? 0);
}

/**
 * A page opened from the Home Screen icon. Safari's 7-day wipe of script-written
 * storage exempts that app and not a tab, so only this form keeps a session.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  }
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
