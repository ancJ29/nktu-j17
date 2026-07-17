import type { Customer, SalesOrder } from '@/types';

export function resolveSalesOrderCustomerName(
  order: SalesOrder,
  getCustomerByCode: (code: string) => Customer | undefined,
): string | undefined {
  let name = order.extra?.customerName;
  if (!name) {
    const code = order.extra?.customerCode;
    if (code) {
      const customer = getCustomerByCode(code);
      if (customer) {
        name = customer.extra?.shortName || customer.name;
      }
    }
  }
  return name;
}

export function createCustomerShortNameResolver(
  customers: readonly Customer[],
): (storedName: string | undefined | null) => string | undefined {
  const byName = new Map<string, Customer>();
  for (const c of customers) {
    const full = c.name?.trim();
    if (full) byName.set(full, c);
    const short = c.extra?.shortName?.trim();
    if (short && !byName.has(short)) byName.set(short, c);
  }
  return (storedName) => {
    const trimmed = storedName?.trim();
    if (!trimmed) return undefined;
    const match = byName.get(trimmed);
    if (!match) return trimmed;
    return match.extra?.shortName?.trim() || match.name;
  };
}
