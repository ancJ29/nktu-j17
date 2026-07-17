

import { newVersion } from '@credo/kits/string';
import { cMngtConnector, cStorageConnector } from '@credo/connectors/connector';
import { appConfig } from '@/config';
import { generateCode } from '@/utils/code';
import {
  getInitialStatusValue,
  getCancellationTargetStatusValue,
} from '@/pages/sales-orders/transitionEngine';
import type { Customer, SalesOrder, SalesOrderActivityEntry, SalesOrderExtra } from '@/types';
import { CUSTOMER_RECORD_TARGET } from '@/stores/useCustomerStore';
import type { CMngtSalesOrderItem as SalesOrderItem } from '@credo/connectors/types';
import { configureSeedConnectors, pad, pick, pickN, randomInt } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

export type SeedSalesOrdersOptions = {
  clientCode: string;
  count: number;
  
  daysBack?: number;
  secrets: FakeDataSecrets;
  onLog?: (line: string) => void;
};

export type SeedSalesOrdersResult = {
  generated: number;
  byStage: Record<'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL', number>;
  cancelled: number;
  partitions: number;
  customersCovered: number;
  productsCovered: number;
};

type SalesOrderRecord = SalesOrder;

type FetchedCustomer = { code: string; name: string; address: string };
type FetchedProduct = { code: string; name: string; unit: string; price: number };
type FetchedEmployee = { id: string; name: string };
type FetchedLocation = { code: string; name: string };

const ORDER_NOTES = [
  '',
  '',
  '',
  '',
  'Giao hàng đúng giờ, liên hệ trước khi giao',
  'Khách yêu cầu hóa đơn VAT',
  'Đóng gói cẩn thận, hàng dễ vỡ',
  'Ưu tiên giao đợt sáng',
  'Giao thứ 6, liên hệ chị Nguyệt trước khi giao',
  'Khách quen — giảm 5% theo thỏa thuận',
];

const PO_REFERENCES = ['', '', '', 'PO-2026-0421', 'PO-2026-0510', 'NK-04', 'KH-2026-04'];

const ADDRESSES_FALLBACK = [
  'Lô B5, KCN Đồng An 2, P. Hòa Phú, Thủ Dầu Một',
  '120 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ',
  '88 Trần Hưng Đạo, P. Phạm Ngũ Lão, Q.1, TP.HCM',
  'Số 5 Đường 30/4, P. Phú Hòa, TP. Thủ Dầu Một',
  '36 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM',
];

const FAKE_GOOGLE_MAP_URL = 'https://maps.app.goo.gl/kqV6gLRZrhef8WUs8';

const dateFormatterUtc7 = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function generateIdAt(date: Date): string {
  const ts = date.getTime().toString(36);
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  let rand = '';
  for (const b of buf) rand += (b % 36).toString(36);
  return `${ts}-${rand}`;
}

function partitionFromId(id: string): string {
  const tsBase36 = id.split('-')[0]!;
  const d = new Date(parseInt(tsBase36, 36));
  return dateFormatterUtc7.format(d);
}

type Stage = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

function rollStage(): Stage {
  const r = Math.random();
  if (r < 0.25) return 'NEW';
  if (r < 0.7) return 'IN_PROGRESS';
  if (r < 0.95) return 'COMPLETED';
  return 'EXCEPTIONAL';
}

function rollCancellation(): boolean {
  return Math.random() < 0.05;
}

async function fetchMasterData(): Promise<{
  customers: FetchedCustomer[];
  products: FetchedProduct[];
  employees: FetchedEmployee[];
  locations: FetchedLocation[];
}> {
  const [cRes, pRes, eRes, lRes] = await Promise.all([
    
    cMngtConnector.getAllSingleRecords(CUSTOMER_RECORD_TARGET).catch(() => null),
    cMngtConnector.getAllProducts().catch(() => null),
    cMngtConnector.getAllEmployees().catch(() => null),
    cMngtConnector.getAllLocations().catch(() => null),
  ]);

  const customers: FetchedCustomer[] =
    cRes && cRes.changed
      ? ((cRes.items ?? []) as Customer[])
          .filter((c) => c.isActive)
          .map((c) => ({ code: c.code, name: c.name, address: c.address ?? '' }))
      : [];

  const products: FetchedProduct[] =
    pRes && pRes.changed
      ? pRes.products
          .filter((p) => p.isActive)
          .map((p) => ({
            code: p.code,
            name: p.name,
            unit: p.unit || 'PC',
            price: typeof p.price === 'number' ? p.price : 0,
          }))
      : [];

  const employees: FetchedEmployee[] =
    eRes && eRes.changed
      ? eRes.employees.filter((e) => e.isActive).map((e) => ({ id: e.id, name: e.name }))
      : [];

  const locations: FetchedLocation[] =
    lRes && lRes.changed
      ? lRes.locations.filter((l) => l.isActive).map((l) => ({ code: l.code, name: l.name }))
      : [];

  return { customers, products, employees, locations };
}

type StatusBucket = { value: string; stage: Stage };

function buildStatusBuckets(): StatusBucket[] {
  return appConfig.features.salesOrders.statusOptions.map((opt) => ({
    value: opt.value,
    stage: opt.stage as Stage,
  }));
}

function pickStatusForStage(buckets: StatusBucket[], stage: Stage): string | undefined {
  const candidates = buckets.filter((b) => b.stage === stage);
  if (candidates.length > 0) return pick(candidates).value;
  if (buckets.length > 0) return pick(buckets).value;
  return undefined;
}

function deriveIsClosed(stage: Stage): boolean {
  return stage === 'COMPLETED' || stage === 'EXCEPTIONAL';
}

function generateOrders(args: {
  count: number;
  daysBack: number;
  customers: FetchedCustomer[];
  products: FetchedProduct[];
  employees: FetchedEmployee[];
  locations: FetchedLocation[];
  buckets: StatusBucket[];
  initialStatus: string | undefined;
  cancellationTargetStatus: string | undefined;
  locationsEnabled: boolean;
  deliveryRequestsEnabled: boolean;
  deliveryMethods: string[];
  tags: string[];
  codePrefix: string;
}): SalesOrderRecord[] {
  const {
    count,
    daysBack,
    customers,
    products,
    employees,
    locations,
    buckets,
    initialStatus,
    cancellationTargetStatus,
    locationsEnabled,
    deliveryRequestsEnabled,
    deliveryMethods,
    tags,
    codePrefix,
  } = args;

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const records: SalesOrderRecord[] = [];

  for (let i = 0; i < count; i++) {
    const offsetDays = Math.random() * Math.max(1, daysBack);
    const baseDate = new Date(nowMs - offsetDays * dayMs);
    baseDate.setHours(randomInt(8, 17), randomInt(0, 59), randomInt(0, 59), 0);

    const id = generateIdAt(baseDate);
    const customer = pick(customers);
    const employee = pick(employees);

    const lineCount = randomInt(1, Math.min(5, products.length));
    const selected = pickN(products, lineCount, lineCount);
    const items: SalesOrderItem[] = selected.map((p) => ({
      productCode: p.code,
      productName: p.name,
      quantity: randomInt(1, 50),
      unit: p.unit,
      unitPrice: p.price > 0 ? p.price : randomInt(5_000, 200_000),
      ...(locationsEnabled && locations.length > 0
        ? { fromLocationCode: pick(locations).code }
        : {}),
    }));

    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

    const stage = rollStage();
    const statusValue = pickStatusForStage(buckets, stage) ?? initialStatus ?? '';
    const isCancelled = rollCancellation();
    const isClosed = deriveIsClosed(stage) || isCancelled;

    const createdAtMs = baseDate.getTime();
    const updatedAtMs = createdAtMs + randomInt(0, 24) * 60 * 60 * 1000;
    const deliveryDateMs = createdAtMs + randomInt(2, 10) * dayMs;

    
    
    
    const activityLog: SalesOrderActivityEntry[] = [
      {
        timestamp: createdAtMs,
        action: 'created',
        toStatus: initialStatus ?? statusValue,
        userId: employee.id,
        userName: employee.name,
      },
    ];
    if (initialStatus && statusValue && statusValue !== initialStatus) {
      activityLog.push({
        timestamp: updatedAtMs,
        action: 'status_change',
        fromStatus: initialStatus,
        toStatus: statusValue,
        userId: employee.id,
        userName: employee.name,
      });
    }

    
    
    
    
    
    const cancellationFromStatus = statusValue;
    const finalStatus =
      isCancelled && cancellationTargetStatus ? cancellationTargetStatus : statusValue;

    if (isCancelled) {
      activityLog.push({
        timestamp: updatedAtMs,
        action: 'cancellation_set',
        userId: employee.id,
        userName: employee.name,
      });
      if (cancellationTargetStatus && cancellationTargetStatus !== statusValue) {
        activityLog.push({
          timestamp: updatedAtMs,
          action: 'status_change',
          fromStatus: statusValue,
          toStatus: cancellationTargetStatus,
          userId: employee.id,
          userName: employee.name,
        });
      }
    }

    const extra: SalesOrderExtra = {
      customerCode: customer.code,
      status: finalStatus,
      createdBy: employee.id,
      assignedStaff: employee.id,
      orderDate: createdAtMs,
      deliveryDate: deliveryDateMs,
      ...(deliveryRequestsEnabled && { isInternalDelivery: Math.random() < 0.7 }),
      ...(customer.address && { deliveryAddress: customer.address }),
      ...(!customer.address && { deliveryAddress: pick(ADDRESSES_FALLBACK) }),
      googleMapUrl: FAKE_GOOGLE_MAP_URL,
      ...(deliveryMethods.length > 0 && { deliveryMethod: pick(deliveryMethods) }),
      ...(tags.length > 0 &&
        Math.random() < 0.4 && { tags: pickN(tags, 1, Math.min(2, tags.length)) }),
      ...(Math.random() < 0.15 && { isUrgent: true }),
      ...(Math.random() < 0.3 && { customerPONumber: pick(PO_REFERENCES) }),
      activityLog,
      ...(isCancelled && {
        cancellation: {
          at: updatedAtMs,
          by: { id: employee.id, name: employee.name },
          fromStatus: cancellationFromStatus,
          reason: 'Khách đổi ý',
        },
      }),
    };

    
    
    
    
    records.push({
      id,
      orderNumber: generateCode(codePrefix),
      customerName: customer.name,
      items,
      isClosed,
      totalAmount,
      notes: Math.random() < 0.3 ? pick(ORDER_NOTES) : '',
      extra,
      createdAt: createdAtMs,
      updatedAt: updatedAtMs,
      ...(isClosed && { closedAt: updatedAtMs }),
      version: newVersion(),
    });
  }

  return records;
}

export async function seedFakeSalesOrders(
  opts: SeedSalesOrdersOptions,
): Promise<SeedSalesOrdersResult> {
  const { clientCode, count, daysBack = 14, secrets, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  log('Fetching master data from BFF (customers, products, employees, locations)...');
  const { customers, products, employees, locations } = await fetchMasterData();

  if (customers.length === 0) {
    throw new Error(
      'No active customers found — seed customers (or create them in the UI) before generating sales orders.',
    );
  }
  if (products.length === 0) {
    throw new Error('No active products found — seed products before generating sales orders.');
  }
  if (employees.length === 0) {
    throw new Error('No active employees found — seed employees before generating sales orders.');
  }

  const buckets = buildStatusBuckets();
  if (buckets.length === 0) {
    throw new Error(
      'Sales Orders has no status options configured — set them up in App Config → Sales Orders first.',
    );
  }

  const initialStatus = getInitialStatusValue();
  const cancellationTargetStatus = getCancellationTargetStatusValue();
  const locationsEnabled = appConfig.features.locations?.enabled ?? false;
  const deliveryRequestsEnabled = appConfig.features.deliveryRequests?.enabled ?? false;
  const deliveryMethods = appConfig.features.salesOrders.deliveryMethodOptions.map((o) => o.value);
  const tags = appConfig.features.salesOrders.tagOptions.map((o) => o.value);
  const codePrefix = appConfig.features.salesOrders.codePrefix;

  log(
    `Master data: ${customers.length} customer(s) · ${products.length} product(s) · ${employees.length} employee(s) · ${locations.length} location(s).`,
  );
  log(
    `Config: status options ${buckets.length} · delivery methods ${deliveryMethods.length} · tags ${tags.length} · locations ${locationsEnabled ? 'on' : 'off'} · DR ${deliveryRequestsEnabled ? 'on' : 'off'}.`,
  );

  log(`Generating ${count} sales order(s) across the last ${daysBack} day(s)...`);
  const records = generateOrders({
    count,
    daysBack,
    customers,
    products,
    employees,
    locations,
    buckets,
    initialStatus,
    cancellationTargetStatus,
    locationsEnabled,
    deliveryRequestsEnabled,
    deliveryMethods,
    tags,
    codePrefix,
  });

  
  const byPartition = new Map<string, SalesOrderRecord[]>();
  for (const r of records) {
    const period = partitionFromId(r.id);
    const arr = byPartition.get(period);
    if (arr) arr.push(r);
    else byPartition.set(period, [r]);
  }

  log(`Writing ${records.length} record(s) across ${byPartition.size} date partition(s)...`);
  const writes: Promise<unknown>[] = [];
  for (const [period, items] of byPartition) {
    log(`  ${period} (${items.length} record(s))`);
    const envelope = {
      items,
      meta: {
        updatedAt: new Date().toISOString(),
        version: 1,
        hash: Date.now().toString(36) + pad(records.length, 4),
      },
    };
    writes.push(
      cStorageConnector.pushRecord({
        serviceCode: secrets.storageServiceCode,
        key: `sales-orders.${clientCode}.${period}`,
        data: envelope,
        isPrivate: undefined,
        description: undefined,
      }),
    );
  }
  await Promise.all(writes);

  
  
  const stageOf = new Map<string, Stage>();
  for (const opt of appConfig.features.salesOrders.statusOptions) {
    stageOf.set(opt.value, opt.stage as Stage);
  }
  const byStage: SeedSalesOrdersResult['byStage'] = {
    NEW: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    EXCEPTIONAL: 0,
  };
  let cancelled = 0;
  const customerCodes = new Set<string>();
  const productCodes = new Set<string>();
  for (const r of records) {
    const status = (r.extra as SalesOrderExtra).status ?? '';
    const stage = stageOf.get(status);
    if (stage) byStage[stage] += 1;
    if ((r.extra as SalesOrderExtra).cancellation) cancelled += 1;
    const code = (r.extra as SalesOrderExtra).customerCode;
    if (code) customerCodes.add(code);
    for (const item of r.items) productCodes.add(item.productCode);
  }

  log(
    `Done — wrote ${records.length} SO(s). NEW=${byStage.NEW} · IN_PROGRESS=${byStage.IN_PROGRESS} · COMPLETED=${byStage.COMPLETED} · EXCEPTIONAL=${byStage.EXCEPTIONAL} · cancelled=${cancelled}.`,
  );

  return {
    generated: records.length,
    byStage,
    cancelled,
    partitions: byPartition.size,
    customersCovered: customerCodes.size,
    productsCovered: productCodes.size,
  };
}
