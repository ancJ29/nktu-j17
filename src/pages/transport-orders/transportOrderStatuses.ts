import {
  canTransitionToStatus,
  createStatusResolver,
  getTransportOrderStatusOptions,
  getTransportOrderStatusTransitions,
  resolveStatusOptions,
  type ResolvedStatusOption,
} from '@/utils/permission';

export function transportOrderStatuses(): ResolvedStatusOption[] {
  return resolveStatusOptions(getTransportOrderStatusOptions());
}

export function findStatus(value: string | undefined): ResolvedStatusOption {
  return createStatusResolver(transportOrderStatuses())(value);
}

export function statusLabel(value: string | undefined): string {
  return findStatus(value).label;
}

export function getNextStatuses(
  current: string | undefined,
  myDepartment: string | null,
): ResolvedStatusOption[] {
  if (!current || isTransportOrderLocked(current)) return [];
  const allowed = getTransportOrderStatusTransitions()[current] ?? [];
  if (allowed.length === 0) return [];
  const byValue = new Map(transportOrderStatuses().map((s) => [s.value, s]));
  return allowed
    .map((v) => byValue.get(v))
    .filter((s): s is ResolvedStatusOption => !!s)
    .filter((s) => canTransitionToStatus(s, myDepartment));
}

export function isTransportOrderLocked(value: string | undefined): boolean {
  const options = getTransportOrderStatusOptions();
  return !!(value && options.find((s) => s.value === value)?.locked);
}

export function getInitialTransportOrderStatus(): string {
  const options = getTransportOrderStatusOptions();
  return (options.find((s) => s.isInitial) ?? options[0])?.value ?? 'new';
}

export function getTransportOrderStatusFlow(): string[] {
  return getTransportOrderStatusOptions().map((s) => s.value);
}

export function statusFlowIndex(value: string | undefined): number {
  return value ? getTransportOrderStatusFlow().indexOf(value) : -1;
}

export function resolveTransportOrderStatus(
  value: string | undefined | null,
): ResolvedStatusOption {
  return findStatus(value ?? undefined);
}
