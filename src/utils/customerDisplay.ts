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

export type CustomerShortNameResolver = (
  storedName: string | undefined | null,
  customerCode?: string | null,
) => string | undefined;

export function createCustomerShortNameResolver(
  customers: readonly Customer[],
): CustomerShortNameResolver {
  const byName = new Map<string, Customer>();
  const byCode = new Map<string, Customer>();
  for (const c of customers) {
    const full = c.name?.trim();
    if (full) byName.set(full, c);
    const short = c.extra?.shortName?.trim();
    if (short && !byName.has(short)) byName.set(short, c);
    const code = c.code?.trim();
    if (code) byCode.set(code, c);
  }
  const display = (c: Customer) => c.extra?.shortName?.trim() || c.name;
  return (storedName, customerCode) => {
    const code = customerCode?.trim();
    if (code) {
      const byCodeMatch = byCode.get(code);

      if (byCodeMatch) return display(byCodeMatch);
    }
    const trimmed = storedName?.trim();
    if (!trimmed) return undefined;
    const match = byName.get(trimmed);
    if (!match) return trimmed;
    return display(match);
  };
}
