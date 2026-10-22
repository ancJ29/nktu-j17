import { stripHiddenNavItems, type NavId } from '@/config/navigation';
import type { NavigationItem } from '@/types';
import type { CredoAppConfig } from '../schema';

export const V2_NAV_IDS: NavId[] = [
  'home',
  'employees',
  'vendors-v2',
  'customers-v2',
  'products-v2',
  'materials-v2',
  'goods-receipts-v2',
  'sales-orders-v2',
  'delivery-notes-v2',
  'lookups-v2',
];

export type ViewerRule = { hiddenForDepartments: string[]; visibleForEmployeeIds: string[] };

export type NavigationForm = {
  pc: NavigationItem[] | null;
  rules: Record<string, ViewerRule>;
};

const asItems = (value: unknown): NavigationItem[] =>
  Array.isArray(value) ? (value as NavigationItem[]) : [];

export const emptyRule = (): ViewerRule => ({
  hiddenForDepartments: [],
  visibleForEmployeeIds: [],
});

const isEmptyRule = (r: ViewerRule) =>
  r.hiddenForDepartments.length === 0 && r.visibleForEmployeeIds.length === 0;

export const flattenNav = (items: NavigationItem[]): NavigationItem[] =>
  items.flatMap((item) => [item, ...flattenNav(item.subs ?? [])]);

export const flattenVisibleNav = (items: NavigationItem[]): NavigationItem[] =>
  items
    .filter((item) => !item.hidden)
    .flatMap((item) => [item, ...flattenVisibleNav(item.subs ?? [])]);

export const readNavigation = (config: CredoAppConfig | null): NavigationForm => {
  const pc = config?.navigationV2 ? asItems(config.navigationV2.pc) : null;
  const rules: Record<string, ViewerRule> = {};
  for (const item of flattenNav(pc ?? [])) {
    const rule: ViewerRule = {
      hiddenForDepartments: Array.isArray(item.hiddenForDepartments)
        ? item.hiddenForDepartments
        : [],
      visibleForEmployeeIds: Array.isArray(item.visibleForEmployeeIds)
        ? item.visibleForEmployeeIds
        : [],
    };
    if (!isEmptyRule(rule)) rules[item.id] = rule;
  }
  return { pc, rules };
};

export const readLegacyPc = (config: CredoAppConfig | null): NavigationItem[] =>
  asItems((config?.navigation as { pc?: unknown } | undefined)?.pc);

const withRules = (items: NavigationItem[], rules: Record<string, ViewerRule>): NavigationItem[] =>
  items.map((item) => {
    const rule = rules[item.id];
    return {
      ...item,
      ...(rule?.hiddenForDepartments.length
        ? { hiddenForDepartments: rule.hiddenForDepartments }
        : {}),
      ...(rule?.visibleForEmployeeIds.length
        ? { visibleForEmployeeIds: rule.visibleForEmployeeIds }
        : {}),
      ...(item.subs?.length ? { subs: withRules(item.subs, rules) } : {}),
    };
  });

export const applyNavigation = (
  storedNav: CredoAppConfig['navigationV2'],
  form: NavigationForm,
): CredoAppConfig['navigationV2'] => {
  if (!form.pc) return undefined;

  return { ...(storedNav ?? {}), pc: withRules(stripHiddenNavItems(form.pc), form.rules) };
};
