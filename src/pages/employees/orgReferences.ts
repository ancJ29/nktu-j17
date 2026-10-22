import type { CMngtAppConfig } from '@credo/kits/types';
import type { Employee } from '@/types';

export function countEmployeesByDepartment(employees: Employee[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of employees) {
    if (e.extra?.isDeleted) continue;
    const dept = e.department;
    if (!dept) continue;
    counts[dept] = (counts[dept] ?? 0) + 1;
  }
  return counts;
}

function labelOf(label: Record<string, string> | undefined, value: string): string {
  if (!label) return value;
  return label.en || label.vi || Object.values(label).find(Boolean) || value;
}

export function collectDepartmentConfigRefs(
  config: Pick<CMngtAppConfig, 'features'>,
  reasons: {
    salesOrderPic: string;
    goodsReceiptPic: string;
    salesOrderStatus: (status: string) => string;
    transportOrderStatus: (status: string) => string;
  },
): Record<string, string[]> {
  const refs: Record<string, string[]> = {};
  const add = (value: string, reason: string) => {
    (refs[value] ??= []).push(reason);
  };

  const f = config.features;

  for (const dept of f.salesOrders?.picDepartments ?? []) add(dept, reasons.salesOrderPic);
  for (const dept of f.goodsReceipts?.picDepartments ?? []) add(dept, reasons.goodsReceiptPic);

  for (const status of f.salesOrders?.statusOptions ?? []) {
    for (const dept of status.allowedDepartments ?? []) {
      add(dept, reasons.salesOrderStatus(labelOf(status.label, status.value)));
    }
  }
  for (const status of f.transportOrders?.statusOptions ?? []) {
    for (const dept of status.allowedDepartments ?? []) {
      add(dept, reasons.transportOrderStatus(labelOf(status.label, status.value)));
    }
  }

  return refs;
}
