import type { SalesOrder, SalesOrderExtra } from '@/types';
import type { SalesOrderWarehouseStaffDiff } from './activityMemo';

export function readWarehouseStaff(
  extra: Pick<SalesOrderExtra, 'warehouseStaff'> | undefined,
): string[] {
  const value: unknown = extra?.warehouseStaff;
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id !== '');
}

type PickableEmployee = { id: string; name: string };

export function buildWarehouseStaffOptions<E extends PickableEmployee>(
  employees: readonly E[],
  filter: (e: E) => boolean,
  selected: readonly string[],
): { value: string; label: string }[] {
  const picked = employees.filter(filter);
  for (const id of selected) {
    if (picked.some((e) => e.id === id)) continue;
    const current = employees.find((e) => e.id === id);
    if (current) picked.push(current);
  }
  return picked.map((e) => ({ value: e.id, label: e.name }));
}

export function formatWarehouseStaffNames(
  ids: readonly string[],
  getName: (id: string) => string | undefined,
): string {
  return ids
    .map((id) => getName(id))
    .filter((name): name is string => !!name)
    .join(', ');
}

export function diffWarehouseStaff(
  before: readonly string[],
  after: readonly string[],
): SalesOrderWarehouseStaffDiff | undefined {
  const same =
    new Set(before).size === new Set(after).size && before.every((id) => after.includes(id));
  if (same) return undefined;
  return {
    ...(before.length > 0 && { from: [...before] }),
    ...(after.length > 0 && { to: [...after] }),
  };
}

export function hasWarehouseStaffMember(order: SalesOrder, employeeId: string): boolean {
  return readWarehouseStaff(order.extra).includes(employeeId);
}
