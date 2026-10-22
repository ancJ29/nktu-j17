import type { Customer, SalesOrder } from '@/types';

export interface CustomerIdentity {
  key: string;
  name: string;

  code?: string;
}

export const UNKNOWN_CUSTOMER: CustomerIdentity = { key: '__unknown', name: 'Không rõ' };

export function createReportCustomerResolver(
  customers: readonly Customer[],
): (o: SalesOrder) => CustomerIdentity {
  const byCode = new Map(customers.map((c) => [c.code?.trim(), c]));
  return (o) => {
    const code = o.extra?.customerCode?.trim();
    if (code) {
      const c = byCode.get(code);

      return { key: `code:${code}`, name: c?.extra?.shortName?.trim() || c?.name || code, code };
    }
    const name = o.extra?.customerName?.trim() || o.customerName?.trim();
    return name ? { key: `name:${name.toLowerCase()}`, name } : UNKNOWN_CUSTOMER;
  };
}
