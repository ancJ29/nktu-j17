import type { CredoNavigationItem } from '../types';
import { resolveIconName } from './icon';

export function resolveNavigation(items: CredoNavigationItem[]): CredoNavigationItem[] {
  return items.map((item) => ({
    ...item,
    icon: resolveIconName(item.icon),
    subs: item.subs ? resolveNavigation(item.subs) : undefined,
  }));
}
