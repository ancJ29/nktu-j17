import type { ResolvedStatusOption } from '@/utils/permission';
import type { SalesOrder } from '@/types';
import type { ResolvedPeriod } from './reportPeriods';
import type { CustomerIdentity } from './reportCustomerIdentity';
import type {
  CustomerEntry,
  CustomerProductReportData,
  ProductEntry,
  ReportKpi,
  SalesMatrixCell,
} from './types';

const viNum = new Intl.NumberFormat('vi-VN');

export interface CustomerProductBuildDeps {
  statusOptions: ResolvedStatusOption[];
  customerOf: (order: SalesOrder) => CustomerIdentity;
}

function isCancelled(o: SalesOrder): boolean {
  return o.extra?.cancellation != null;
}

function productKeyOf(code: string | undefined, name: string, unit: string): string {
  return `${code ?? name}|${unit}`;
}

export function buildCustomerProductReport(
  period: ResolvedPeriod,
  orders: SalesOrder[],
  deps: CustomerProductBuildDeps,
): CustomerProductReportData {
  const stageOf = new Map(deps.statusOptions.map((o) => [o.value, o.stage]));
  const isCompleted = (o: SalesOrder) =>
    o.isClosed || stageOf.get(o.extra?.status ?? '') === 'COMPLETED';

  const customers = new Map<string, CustomerEntry>();
  const products = new Map<string, ProductEntry>();
  const cells = new Map<string, SalesMatrixCell>();

  const productCustomers = new Map<string, Set<string>>();

  for (const o of orders) {
    if (isCancelled(o)) continue;
    const who = deps.customerOf(o);

    let customer = customers.get(who.key);
    if (!customer) {
      customer = {
        key: who.key,
        name: who.name,
        ...(who.code ? { code: who.code } : {}),
        orders: 0,
        amount: 0,
        completedOrders: 0,
        completedAmount: 0,
      };
      customers.set(who.key, customer);
    }
    customer.orders += 1;
    const completed = isCompleted(o);
    if (completed) customer.completedOrders += 1;

    const seenInOrder = new Set<string>();

    for (const it of o.items) {
      if (it.role === 'set-component') continue;
      const code = it.productCode?.trim() || undefined;
      const name = it.productName?.trim() || code || '—';
      const unit = it.unit?.trim() || '';
      const qty = it.quantity ?? 0;
      const amount = qty * (it.unitPrice ?? 0);
      const pKey = productKeyOf(code, name, unit);
      const first = !seenInOrder.has(pKey);
      seenInOrder.add(pKey);

      const product = products.get(pKey) ?? {
        key: pKey,
        name,
        ...(code ? { code } : {}),
        unit,
        qty: 0,
        amount: 0,
        orders: 0,
        customers: 0,
      };
      product.qty += qty;
      product.amount += amount;
      if (first) product.orders += 1;
      products.set(pKey, product);

      const cKey = `${who.key}\u0000${pKey}`;
      const cell = cells.get(cKey) ?? { c: who.key, p: pKey, qty: 0, amount: 0, orders: 0 };
      cell.qty += qty;
      cell.amount += amount;
      if (first) cell.orders += 1;
      cells.set(cKey, cell);

      const buyers = productCustomers.get(pKey) ?? new Set<string>();
      buyers.add(who.key);
      productCustomers.set(pKey, buyers);

      customer.amount += amount;
      if (completed) customer.completedAmount += amount;
    }
  }

  for (const [key, buyers] of productCustomers) {
    const p = products.get(key);
    if (p) p.customers = buyers.size;
  }

  const customerRows = [...customers.values()].sort((a, b) => b.amount - a.amount);
  const productRows = [...products.values()].sort((a, b) => b.amount - a.amount);
  const totalAmount = customerRows.reduce((a, c) => a + c.amount, 0);
  const totalOrders = customerRows.reduce((a, c) => a + c.orders, 0);

  const kpis: ReportKpi[] = [
    { key: 'revenue', value: viNum.format(Math.round(totalAmount)), unitKey: 'vnd' },
    { key: 'orders', value: viNum.format(totalOrders), unitKey: 'orders' },
    { key: 'customers', value: viNum.format(customerRows.length), unitKey: 'customersShort' },
    { key: 'products', value: viNum.format(productRows.length), unitKey: 'productsShort' },
  ];

  return {
    periodLabel: period.label,
    periodRange: period.rangeText,
    kpis,
    customers: customerRows,
    products: productRows,
    cells: [...cells.values()],
  };
}
