import type { KeyboardEvent } from 'react';

export function blockImplicitSubmit(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter') return;
  if (event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
  if (target.isContentEditable) return;
  event.preventDefault();
}
