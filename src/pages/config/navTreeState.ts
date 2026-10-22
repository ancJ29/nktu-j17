import { NAV_REGISTRY, type NavId } from '@/config/navigation';
import { IconName } from '@credo/base-ui/components';

export type NavItemState = {
  id: string;
  icon: IconName;
  visible: boolean;
  navbar?: boolean;

  customLabel?: string;
};

export type NavGroupState = NavItemState & {
  subs: NavItemState[];
};

export type NavPlatformState = (NavItemState | NavGroupState)[];

export function isGroup(item: NavItemState | NavGroupState): item is NavGroupState {
  return 'subs' in item;
}

export function isCustomGroup(item: NavItemState | NavGroupState): boolean {
  return !(item.id in NAV_REGISTRY);
}

export function getRegistryEntry(id: string) {
  return (NAV_REGISTRY as Record<string, (typeof NAV_REGISTRY)[NavId] | undefined>)[id];
}

export function getDisplayLabel(item: NavItemState | NavGroupState): string {
  if (isCustomGroup(item)) return item.customLabel ?? '';
  return getRegistryEntry(item.id)?.label ?? '';
}

export function newCustomGroupId(): string {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type ConfigItem = {
  id: string;

  label?: string;
  icon?: string;
  navbar?: boolean;
  hidden?: boolean;
  subs?: { id: string; label?: string; icon?: string; navbar?: boolean; hidden?: boolean }[];
};

export function configToState(configItems: ConfigItem[], allIds: NavId[]): NavPlatformState {
  const result: NavPlatformState = [];
  const seen = new Set<string>();

  for (const item of configItems) {
    const entry = getRegistryEntry(item.id);
    const isCustom = !entry;

    if (!isCustom && !allIds.includes(item.id as NavId)) continue;
    seen.add(item.id);

    const defaultIcon = entry?.defaultIcon ?? IconName.Category2;

    if (item.subs && item.subs.length > 0) {
      const subs: NavItemState[] = item.subs
        // For now subs must be registry items — drop dangling refs.
        .filter((s) => allIds.includes(s.id as NavId) && NAV_REGISTRY[s.id as NavId])
        .map((s) => {
          seen.add(s.id);
          return {
            id: s.id as NavId,
            icon: (s.icon as IconName) ?? NAV_REGISTRY[s.id as NavId]?.defaultIcon ?? IconName.Box,
            visible: !s.hidden,
            navbar: s.navbar,
          };
        });
      result.push({
        id: item.id,
        icon: (item.icon as IconName) ?? defaultIcon,
        visible: !item.hidden,
        navbar: item.navbar,
        ...(isCustom ? { customLabel: item.label ?? '' } : {}),
        subs,
      });
    } else if (isCustom) {
      result.push({
        id: item.id,
        icon: (item.icon as IconName) ?? defaultIcon,
        visible: !item.hidden,
        navbar: item.navbar,
        customLabel: item.label ?? '',
        subs: [],
      });
    } else {
      result.push({
        id: item.id,
        icon: (item.icon as IconName) ?? defaultIcon,
        visible: !item.hidden,
        navbar: item.navbar,
      });
    }
  }

  for (const id of allIds) {
    if (seen.has(id)) continue;
    const entry = NAV_REGISTRY[id];
    if (!entry) continue;
    result.push({ id, icon: entry.defaultIcon, visible: false });
  }

  return result;
}

export function stateToConfigItems(state: NavPlatformState) {
  return state.map((item) => {
    const entry = getRegistryEntry(item.id);
    const base: {
      id: string;
      path?: string;
      labelKey?: string;
      label: string;
      icon: string;
      navbar?: true;
      hidden?: true;
    } = entry
      ? {
          id: item.id,
          ...(entry.path ? { path: entry.path } : {}),
          labelKey: entry.labelKey,
          label: entry.label,
          icon: item.icon as string,
          ...(item.navbar ? { navbar: true } : {}),
          ...(!item.visible ? { hidden: true } : {}),
        }
      : {
          id: item.id,
          label: item.customLabel ?? '',
          icon: item.icon as string,
          ...(item.navbar ? { navbar: true } : {}),
          ...(!item.visible ? { hidden: true } : {}),
        };
    if (isGroup(item)) {
      return {
        ...base,
        subs: item.subs.map((s) => {
          const subEntry = getRegistryEntry(s.id);
          if (!subEntry) {
            return {
              id: s.id,
              label: s.customLabel ?? '',
              icon: s.icon as string,
              ...(s.navbar ? { navbar: true } : {}),
              ...(!s.visible ? { hidden: true } : {}),
            };
          }
          return {
            id: s.id,
            ...(subEntry.path ? { path: subEntry.path } : {}),
            labelKey: subEntry.labelKey,
            label: subEntry.label,
            icon: s.icon as string,
            ...(s.navbar ? { navbar: true } : {}),
            ...(!s.visible ? { hidden: true } : {}),
          };
        }),
      };
    }
    return base;
  });
}
