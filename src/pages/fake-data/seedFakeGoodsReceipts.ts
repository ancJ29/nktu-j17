import { newVersion } from '@credo/kits/string';
import { cMngtConnector, cStorageConnector } from '@credo/connectors/connector';
import { loadIndustry, type IndustryName } from '../../../scripts/faker/industry';
import type { GoodsReceiptItem, GoodsReceiptItemType, GoodsReceiptStatus, Vendor } from '@/types';
import { VENDOR_RECORD_TARGET } from '@/stores/useVendorStore';
import { configureSeedConnectors, pad, pick, pickN, randomInt } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';
import type { NullableDateTimeInput } from '@credo/kits/types';

export type SeedGoodsReceiptsOptions = {
  clientCode: string;
  industry: IndustryName;
  count: number;

  daysBack?: number;
  secrets: FakeDataSecrets;
  onLog?: (line: string) => void;
};

export type SeedGoodsReceiptsResult = {
  generated: number;
  byStatus: Record<GoodsReceiptStatus, number>;
  partitions: number;
};

type GoodsReceiptRecord = {
  id: string;
  receiptNumber: string;
  vendorCode: string;
  vendorName: string;
  locationCode: string;
  locationName: string;
  receivedDate: NullableDateTimeInput;
  reference: string;
  status: GoodsReceiptStatus;
  items: GoodsReceiptItem[];
  totalQuantity: number;
  notes: string;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  receivedAt: string | null;
  cancelledAt: string | null;
  version: string;
};

type FetchedVendor = { code: string; name: string; extra: { shortName: string } };
type FetchedLocation = { code: string; name: string };

const RECEIPT_NOTES = [
  '',
  '',
  '',
  'Hàng đầy đủ, đóng gói tốt',
  'Có vài thùng móp nhẹ, vẫn nhận',
  'Giao đúng hẹn',
  'Thiếu một ít — vendor sẽ giao bù đợt sau',
  'Kiểm tra kỹ hạn sử dụng trước khi nhập kho',
  'Nhập kho cuối ngày',
];

const ITEM_NOTES = ['', '', '', 'Số lô đã ghi nhận', 'Cần dán nhãn lại', 'Kiểm hàng kỹ'];

const REFERENCES = ['', '', '', 'PO-2026-0421', 'PO-2026-0510', 'PO-2026-0512', 'NK-04', 'NK-05'];

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

function fmtDate(d: Date): string {
  return dateFormatterUtc7.format(d);
}

function rollStatus(): GoodsReceiptStatus {
  const r = Math.random();
  if (r < 0.6) return 'draft';
  if (r < 0.9) return 'received';
  return 'cancelled';
}

async function fetchVendorsAndLocations(): Promise<{
  vendors: FetchedVendor[];
  locations: FetchedLocation[];
}> {
  const [vRes, lRes] = await Promise.all([
    cMngtConnector.getAllSingleRecords(VENDOR_RECORD_TARGET).catch(() => null),
    cMngtConnector.getAllLocations().catch(() => null),
  ]);

  const vendors: FetchedVendor[] =
    vRes && vRes.changed
      ? ((vRes.items ?? []) as Vendor[])
          .filter((v) => v.isActive)
          .map((v) => ({
            code: v.code,
            name: v.name,
            extra: { shortName: (v.extra?.shortName ?? '') as string },
          }))
      : [];
  const locations: FetchedLocation[] =
    lRes && lRes.changed
      ? lRes.locations.filter((l) => l.isActive).map((l) => ({ code: l.code, name: l.name }))
      : [];

  return { vendors, locations };
}

type ItemPoolEntry = {
  itemType: GoodsReceiptItemType;
  itemCode: string;
  itemName: string;
  unit: string;
};

function buildItemsPool(industry: IndustryName): ItemPoolEntry[] {
  const { products, materials } = loadIndustry(industry);
  const pool: ItemPoolEntry[] = [];
  for (const p of products) {
    pool.push({
      itemType: 'product',
      itemCode: p.code,
      itemName: p.name,
      unit: p.units[0] ?? 'PC',
    });
  }
  for (const m of materials) {
    pool.push({
      itemType: 'product',
      itemCode: m.code,
      itemName: m.name,
      unit: m.units[0] ?? 'KG',
    });
  }
  return pool;
}

function generateReceipts(
  count: number,
  daysBack: number,
  pool: ItemPoolEntry[],
  vendors: FetchedVendor[],
  locations: FetchedLocation[],
): GoodsReceiptRecord[] {
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const records: GoodsReceiptRecord[] = [];

  for (let i = 0; i < count; i++) {
    const offsetDays = Math.random() * Math.max(1, daysBack);
    const baseDate = new Date(nowMs - offsetDays * dayMs);
    baseDate.setHours(randomInt(8, 17), randomInt(0, 59), randomInt(0, 59), 0);

    const id = generateIdAt(baseDate);
    const vendor = pick(vendors);
    const location = pick(locations);

    const lineCount = randomInt(1, Math.min(5, pool.length));
    const selected = pickN(pool, lineCount, lineCount);

    const items: GoodsReceiptItem[] = selected.map((src) => ({
      itemType: src.itemType,
      itemCode: src.itemCode,
      itemName: src.itemName,
      quantity: randomInt(5, 200),
      unit: src.unit,
      ...(Math.random() < 0.25 && { note: pick(ITEM_NOTES) }),
    }));

    const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
    const status = rollStatus();
    const createdAtMs = baseDate.getTime();
    const createdAt = new Date(createdAtMs).toISOString();

    let receivedAt: string | null = null;
    let cancelledAt: string | null = null;
    let updatedAtMs = createdAtMs;
    if (status === 'received') {
      const r = createdAtMs + randomInt(1, 24) * 60 * 60 * 1000;
      receivedAt = new Date(r).toISOString();
      updatedAtMs = r;
    } else if (status === 'cancelled') {
      const c = createdAtMs + randomInt(1, 12) * 60 * 60 * 1000;
      cancelledAt = new Date(c).toISOString();
      updatedAtMs = c;
    }

    const yymmdd = fmtDate(baseDate).replace(/-/g, '').slice(2);
    const receiptNumber = `PNK-${yymmdd}-${pad(i + 1, 4)}`;

    records.push({
      id,
      receiptNumber,
      vendorCode: vendor.code,
      vendorName: vendor?.extra?.shortName ?? vendor.name,
      locationCode: location.code,
      locationName: location.name,
      receivedDate: fmtDate(baseDate),
      reference: pick(REFERENCES),
      status,
      items,
      totalQuantity,
      notes: Math.random() < 0.4 ? pick(RECEIPT_NOTES) : '',
      extra: {},
      createdAt,
      updatedAt: new Date(updatedAtMs).toISOString(),
      receivedAt,
      cancelledAt,
      version: newVersion(),
    });
  }

  return records;
}

export async function seedFakeGoodsReceipts(
  opts: SeedGoodsReceiptsOptions,
): Promise<SeedGoodsReceiptsResult> {
  const { clientCode, industry, count, daysBack = 14, secrets, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  log('Fetching vendors and locations from BFF...');
  const { vendors, locations } = await fetchVendorsAndLocations();
  if (vendors.length === 0) {
    throw new Error(
      'No active vendors found — seed or create vendors before generating goods receipts.',
    );
  }
  if (locations.length === 0) {
    throw new Error(
      'No active locations found — seed or create locations before generating goods receipts.',
    );
  }

  const pool = buildItemsPool(industry);
  if (pool.length === 0) {
    throw new Error('Industry has no products or materials — pick a different industry.');
  }
  log(
    `Industry: ${industry} | Items pool: ${pool.length} (products + materials) | Vendors: ${vendors.length} | Locations: ${locations.length}`,
  );

  log(`Generating ${count} goods receipt(s) across the last ${daysBack} day(s)...`);
  const records = generateReceipts(count, daysBack, pool, vendors, locations);

  const byPartition = new Map<string, GoodsReceiptRecord[]>();
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
        hash: Date.now().toString(36),
      },
    };
    writes.push(
      cStorageConnector.pushRecord({
        serviceCode: secrets.storageServiceCode,
        key: `goods-receipts.${clientCode}.${period}`,
        data: envelope,
        isPrivate: undefined,
        description: undefined,
      }),
    );
  }
  await Promise.all(writes);

  const byStatus = records.reduce<Record<GoodsReceiptStatus, number>>(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { draft: 0, received: 0, cancelled: 0 },
  );

  log(
    `Done — wrote ${records.length} GR(s). Draft=${byStatus.draft} · Received=${byStatus.received} · Cancelled=${byStatus.cancelled}.`,
  );

  return { generated: records.length, byStatus, partitions: byPartition.size };
}
