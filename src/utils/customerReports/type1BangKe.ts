import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  orderTotals,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import type { CustomerReportBuilder, CustomerReportInput, CustomerReportResult } from './types';

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;
const FMT_MONEY = '#,##0';

const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

const SIZE_BUCKETS = [
  { key: '20', header: '20ft' },
  { key: '40', header: '40ft' },
] as const;

function sizeBucketIndex(containerSize: string | undefined): number {
  const digits = (containerSize ?? '').trim().match(/^(\d+)/)?.[1];
  return digits ? SIZE_BUCKETS.findIndex((b) => b.key === digits) : -1;
}

type Type1FeeColumnKey = 'freight' | 'surcharge' | 'handling' | 'demurrage' | 'other';

export const SERVICE_FEE_COLUMNS: ReadonlyArray<{ key: Type1FeeColumnKey; header: string }> = [
  { key: 'freight', header: 'PHÍ VẬN CHUYỂN' },
  { key: 'surcharge', header: 'PHỤ THU VC' },
  { key: 'handling', header: 'BỐC XẾP' },
  { key: 'demurrage', header: 'PHÍ NEO XE' },
  { key: 'other', header: 'PHÍ KHÁC' },
];

const FALLBACK_FEE_COLUMN: Type1FeeColumnKey = 'other';

const FEE_NAME_COLUMN: Readonly<Record<string, Type1FeeColumnKey>> = {
  PHI_VAN_CHUYEN: 'freight',
  PHI_GUI: 'other',
  PHI_HA_SOM: 'other',
  PHI_KHAC: 'other',
  PHI_NEO_XE: 'demurrage',
  PHI_TRAM: 'surcharge',
  PHI_DIEN_KHOAN: 'other',

  PHU_THU_VAN_CHUYEN: 'surcharge',
  BOC_XEP: 'handling',
  VE_TRAM_PHU_HUU: 'surcharge',
  VE_TRAM_XLHN: 'surcharge',
  PHI_THAO_NHAN: 'other',
  LO_XE: 'other',
  VE_SINH_CONT: 'other',
  PHU_PHI_DAU: 'other', // Phụ phí đầu
};

export const CHI_HO_FEE_NAMES: ReadonlyArray<string> = [
  'PHI_CAN_XE',
  'PHI_NANG',
  'PHI_HA',
  'PHI_QUA_KHAU', // Phí qua khẩu
];

const NORMALIZED_FEE_COLUMN: ReadonlyMap<string, Type1FeeColumnKey> = new Map(
  Object.entries(FEE_NAME_COLUMN).map(([value, col]) => [feeKey(value), col]),
);

function serviceFeeColumnOf(
  storedValue: string,
  resolvedLabel: string,
  labelKeyed: ReadonlyMap<string, Type1FeeColumnKey>,
): Type1FeeColumnKey {
  const direct = FEE_NAME_COLUMN[storedValue];
  if (direct) return direct;

  const normalized = NORMALIZED_FEE_COLUMN.get(feeKey(storedValue));
  if (normalized) return normalized;

  return labelKeyed.get(feeKey(resolvedLabel)) ?? FALLBACK_FEE_COLUMN;
}

function buildLabelKeyedColumns(
  resolveFeeName: (value: string) => string,
): Map<string, Type1FeeColumnKey> {
  const map = new Map<string, Type1FeeColumnKey>();
  for (const [value, col] of Object.entries(FEE_NAME_COLUMN)) {
    const label = resolveFeeName(value);
    if (label) map.set(feeKey(label), col);
  }
  return map;
}

const PAYMENT_BLOCKS = [
  {
    intro:
      'Vui lòng thanh toán cho công ty chúng tôi PHÍ VẬN CHUYỂN trên bằng chuyển khoản theo thông tin:',

    beneficiaryLabel: 'Công ty thụ hưởng:',
    beneficiary: undefined as string | undefined,
    account: '102 796 7777  Tại ngân hàng Vietcombank, Chi nhánh Hồ Chí Minh',
  },
  {
    intro:
      'Vui lòng thanh toán PHÍ CHI HỘ cho chúng tôi số tiền nêu trên bằng chuyển khoản theo thông tin:',
    beneficiaryLabel: 'Người thụ hưởng:',
    beneficiary: 'VÕ VĂN HÀO',
    account: '19038044220014 Tại Ngân hàng kỹ thương Việt Nam (Techcombank)',
  },
] as const;

function bangKePeriodLabel(orders: ReadonlyArray<TransportOrder>): string {
  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  for (const o of orders) {
    const t = new Date(orderPlanDate(o) as string | number | Date).getTime();
    if (Number.isNaN(t)) continue;
    earliest = Math.min(earliest, t);
    latest = Math.max(latest, t);
  }
  if (!Number.isFinite(earliest)) {
    const now = new Date();
    return `THÁNG ${now.getMonth() + 1}/${now.getFullYear()}`;
  }
  const from = new Date(earliest);
  const to = new Date(latest);
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `THÁNG ${from.getMonth() + 1}/${from.getFullYear()}`;
  }
  return `TỪ ${formatDate(earliest)} ĐẾN ${formatDate(latest)}`;
}

function billedLines(
  order: TransportOrder,
  kind: TransportOrderFee['kind'],
  resolveFeeName: (value: string) => string,
): TransportOrderFee[] {
  return readFeeLines(order)
    .filter((f) => f.kind === kind && isBillableFee(f))
    .map((f) => ({ ...f, label: resolveFeeName(f.label) }));
}

type ChiHoSlot = 'amount' | 'invoiceNo' | 'name';

const CHI_HO_SLOT_HEADER: Record<ChiHoSlot, string> = {
  amount: 'SỐ TIỀN',
  invoiceNo: 'SỐ HĐ',
  name: 'TÊN PHÍ',
};

type ServiceColumn =
  | { key: Type1FeeColumnKey; header: string; feeValue?: undefined }
  | { key?: undefined; header: string; feeValue: string };

export type BangKeLayout = {
  serviceColumns: ReadonlyArray<ServiceColumn>;

  chiHoSlots: ReadonlyArray<ChiHoSlot>;

  reservedChiHo?: ReadonlyArray<{
    feeValue: string;
    header: string;
    slots: ReadonlyArray<ChiHoSlot>;
  }>;
};

const TYPE1_LAYOUT: BangKeLayout = {
  serviceColumns: SERVICE_FEE_COLUMNS,
  chiHoSlots: ['amount', 'invoiceNo', 'name'],
};

export const buildBangKeSheet = (
  orders: ReadonlyArray<TransportOrder>,
  {
    seller,
    customer,
    resolveShipmentType,

    resolveFeeName,
    getTruckPlate,
    titleSuffix,
  }: CustomerReportInput,
  layout: BangKeLayout,
): CustomerReportResult => {
  const rows = orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));

  const feeCols = layout.serviceColumns;
  const labelKeyed = buildLabelKeyedColumns(resolveFeeName);

  const feeColIndexOf = (key: Type1FeeColumnKey) => {
    const i = feeCols.findIndex((c) => c.key === key);
    if (i >= 0) return i;
    return Math.max(
      0,
      feeCols.findIndex((c) => c.key === FALLBACK_FEE_COLUMN),
    );
  };

  const pinnedFeeKeys = feeCols.map((c) =>
    c.feeValue === undefined ? undefined : feeKey(resolveFeeName(c.feeValue)),
  );

  const feeColOf = (fee: TransportOrderFee) => {
    const key = feeKey(fee.label);
    const pinned = pinnedFeeKeys.findIndex((k) => k !== undefined && k === key);
    if (pinned >= 0) return pinned;
    return feeColIndexOf(serviceFeeColumnOf(fee.label, resolveFeeName(fee.label), labelKeyed));
  };

  const chiHoLines = (o: TransportOrder) =>
    billedLines(o, 'passthrough', resolveFeeName).filter((f) => (f.amount || 0) !== 0);

  const reservedFees = layout.reservedChiHo ?? [];
  const reservedKeys = reservedFees.map((r) => feeKey(resolveFeeName(r.feeValue)));

  const splitChiHo = (o: TransportOrder) => {
    const lines = chiHoLines(o);
    const taken = new Set<number>();
    const reserved = reservedKeys.map((key) => {
      const i = lines.findIndex((f, k) => !taken.has(k) && feeKey(f.label) === key);
      if (i < 0) return undefined;
      taken.add(i);
      return lines[i];
    });
    return { reserved, rest: lines.filter((_, k) => !taken.has(k)) };
  };

  let dynamicGroups = 0;
  for (const o of rows) {
    dynamicGroups = Math.max(dynamicGroups, splitChiHo(o).rest.length);
  }

  const chiHoGroupLine = (o: TransportOrder, g: number) => {
    const { reserved, rest } = splitChiHo(o);
    return g < reservedFees.length ? reserved[g] : rest[g - reservedFees.length];
  };

  const chiHoColumns: ReadonlyArray<{ group: number; slot: ChiHoSlot; header: string }> = [
    ...reservedFees.flatMap((r, g) =>
      r.slots.map((slot, s) => ({
        group: g,
        slot,
        header: s === 0 ? r.header : CHI_HO_SLOT_HEADER[slot],
      })),
    ),
    ...Array.from({ length: dynamicGroups }, (_, k) =>
      layout.chiHoSlots.map((slot) => ({
        group: reservedFees.length + k,
        slot,
        header: CHI_HO_SLOT_HEADER[slot],
      })),
    ).flat(),
  ];

  const chiHoSlotAt = (c: number) => chiHoColumns[c - C_CHIHO0]?.slot;

  const hasNotes = rows.some((o) => !!o.notes?.trim());
  const showFooter = true;

  const rates = new Set(rows.map((o) => o.vatRate ?? 0));
  const uniformRate = rates.size === 1 ? [...rates][0]! : undefined;
  const vatHeader =
    uniformRate && uniformRate > 0 ? `VAT ${Number((uniformRate * 100).toFixed(2))}%` : 'VAT';

  const C_STT = 0;
  const C_DATE = 1;
  const C_TRUCK = 2;
  const C_BL = 3;
  const C_CONT = 4;
  const C_SIZE0 = 5;
  const C_TYPE = C_SIZE0 + SIZE_BUCKETS.length;
  const C_PICKUP = C_TYPE + 1;
  const C_STUFFING = C_PICKUP + 1;
  const C_DROPOFF = C_STUFFING + 1;
  const C_FEE0 = C_DROPOFF + 1;
  const C_VAT = C_FEE0 + feeCols.length;
  const C_TOTAL = C_VAT + 1;
  const C_NOTE = hasNotes ? C_TOTAL + 1 : -1;
  const C_CHIHO0 = (hasNotes ? C_NOTE : C_TOTAL) + 1;
  const colCount = C_CHIHO0 + chiHoColumns.length;
  const lastCol = colCount - 1;

  const aoa: CellValue[][] = [];
  const merges: XLSX.Range[] = [];
  const blankRow = () => aoa.push([]);
  const banner = (text: string): number => {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    row[0] = text;
    aoa.push(row);
    merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });
    return r;
  };

  const rSeller = banner(seller.name);
  banner(seller.address);
  banner(`MST: ${seller.taxCode}`);
  const suffix = titleSuffix?.trim() ? ` ${titleSuffix.trim()}` : '';
  const rTitle = banner(`BẢNG KÊ VẬN CHUYỂN${suffix} ${bangKePeriodLabel(rows)}`);
  const rDear = banner(`Kính gửi: ${customer.name}`);
  banner(`Địa chỉ: ${customer.address ?? ''}`);
  banner(`MST: ${customer.taxCode ?? ''}`);
  blankRow();

  const rHead1 = aoa.length;
  const rHead2 = rHead1 + 1;
  const head1: CellValue[] = new Array(colCount).fill('');
  const head2: CellValue[] = new Array(colCount).fill('');
  const leaf = (c: number, label: string) => {
    head1[c] = label;
    merges.push({ s: { r: rHead1, c }, e: { r: rHead2, c } });
  };
  const group = (c0: number, c1: number, label: string, subs: string[]) => {
    head1[c0] = label;
    if (c1 > c0) merges.push({ s: { r: rHead1, c: c0 }, e: { r: rHead1, c: c1 } });
    subs.forEach((s, i) => {
      head2[c0 + i] = s;
    });
  };

  leaf(C_STT, 'STT');
  leaf(C_DATE, 'NGÀY V/C');
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_BL, 'SỐ B/L; B/K');
  leaf(C_CONT, 'SỐ CONT');
  group(
    C_SIZE0,
    C_SIZE0 + SIZE_BUCKETS.length - 1,
    'SẢN LƯỢNG',
    SIZE_BUCKETS.map((b) => b.header),
  );
  leaf(C_TYPE, 'LOẠI HÌNH');
  group(C_PICKUP, C_DROPOFF, 'TUYẾN DỊCH VỤ', ['NƠI LẤY', 'NƠI ĐÓNG/RÚT HÀNG', 'NƠI HẠ']);
  group(C_FEE0, C_VAT, 'PHÍ DỊCH VỤ', [...feeCols.map((f) => f.header), vatHeader]);
  leaf(C_TOTAL, 'TỔNG CỘNG');
  if (hasNotes) leaf(C_NOTE, 'NOTE');
  if (chiHoColumns.length > 0) {
    group(
      C_CHIHO0,
      lastCol,
      'PHÍ CHI HỘ',
      chiHoColumns.map((col) => col.header),
    );
  }
  aoa.push(head1, head2);

  const truckLabel = (name: string, truckId: string | undefined) => getTruckPlate(truckId) ?? name;

  let sumService = 0;
  let sumVat = 0;
  let sumChiHo = 0;
  const rFirstData = aoa.length;
  rows.forEach((o, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_STT] = i + 1;
    row[C_DATE] = formatDate(orderPlanDate(o));
    if (o.isMultiTrip && (o.trips?.length ?? 0) > 0) {
      const plates: string[] = [];
      for (const trip of o.trips!) {
        const p = truckLabel(trip.truckPlate, trip.truckId);
        if (p && !plates.includes(p)) plates.push(p);
      }
      row[C_TRUCK] = plates.join('; ');
    } else {
      row[C_TRUCK] = truckLabel(o.truckPlate, o.truckId);
    }
    row[C_BL] = o.billNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';

    const s = sizeBucketIndex(o.containerSize);
    if (s >= 0) row[C_SIZE0 + s] = 1;
    row[C_TYPE] = o.shipmentType ? resolveShipmentType(o.shipmentType).toLocaleUpperCase('vi') : '';
    row[C_PICKUP] = o.route?.pickup ?? '';
    row[C_STUFFING] = o.route?.stuffing ?? '';
    row[C_DROPOFF] = o.route?.dropoff ?? '';

    for (const fee of billedLines(o, 'service', resolveFeeName)) {
      const c = C_FEE0 + feeColOf(fee);
      const prev = typeof row[c] === 'number' ? (row[c] as number) : 0;
      const next = prev + (fee.amount || 0);
      if (next !== 0) row[c] = next;
    }

    const totals = orderTotals(o);
    if (totals.vatAmount !== 0) row[C_VAT] = totals.vatAmount;
    const serviceTotal = totals.serviceSubtotal + totals.vatAmount;
    if (serviceTotal !== 0) row[C_TOTAL] = serviceTotal;
    if (hasNotes) row[C_NOTE] = o.notes ?? '';

    chiHoColumns.forEach((col, i) => {
      const fee = chiHoGroupLine(o, col.group);
      if (!fee) return;
      row[C_CHIHO0 + i] =
        col.slot === 'amount'
          ? fee.amount
          : col.slot === 'invoiceNo'
            ? (fee.invoiceNo ?? '')
            : fee.label;
    });

    for (const fee of chiHoLines(o)) sumChiHo += fee.amount;

    sumService += totals.serviceSubtotal;
    sumVat += totals.vatAmount;
    aoa.push(row);
  });
  const rLastData = aoa.length - 1;

  const rTotalRow = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_STT] = 'TOTAL';
    merges.push({ s: { r: rTotalRow, c: C_STT }, e: { r: rTotalRow, c: C_CONT } });
    SIZE_BUCKETS.forEach((_bucket, s) => {
      row[C_SIZE0 + s] = rows.filter((o) => sizeBucketIndex(o.containerSize) === s).length;
    });
    feeCols.forEach((_col, f) => {
      let sum = 0;
      for (const o of rows) {
        for (const fee of billedLines(o, 'service', resolveFeeName)) {
          if (feeColOf(fee) === f) sum += fee.amount || 0;
        }
      }
      row[C_FEE0 + f] = sum;
    });
    row[C_VAT] = sumVat;
    row[C_TOTAL] = sumService + sumVat;

    chiHoColumns.forEach((col, i) => {
      if (col.slot !== 'amount') return;
      let sum = 0;
      for (const o of rows) sum += chiHoGroupLine(o, col.group)?.amount ?? 0;
      row[C_CHIHO0 + i] = sum;
    });
    aoa.push(row);
  }

  let rFirstSummary = -1;
  let rLastSummary = -1;
  if (showFooter) {
    blankRow();
    const summary = (label: string, value: number): number => {
      const r = aoa.length;
      const row: CellValue[] = new Array(colCount).fill('');
      row[0] = label;
      row[C_TOTAL] = value;
      aoa.push(row);
      merges.push({ s: { r, c: 0 }, e: { r, c: C_TOTAL - 1 } });
      return r;
    };
    rFirstSummary = summary('Số tiền cước vận chuyển:', sumService + sumVat);
    summary('Số tiền chi hộ:', sumChiHo);
    rLastSummary = summary('Tổng số tiền cần thanh toán:', sumService + sumVat + sumChiHo);
  }

  const paymentLines: number[] = [];
  const introRows = new Set<number>();
  const fullWidthRow = (text: string): number => {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    row[0] = text;
    aoa.push(row);
    merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    paymentLines.push(r);
    return r;
  };
  for (const block of PAYMENT_BLOCKS) {
    blankRow();
    introRows.add(fullWidthRow(block.intro));
    fullWidthRow(`${block.beneficiaryLabel} ${block.beneficiary ?? seller.name}`);
    fullWidthRow(`Số tài khoản: ${block.account}`);
  }

  blankRow();
  const rSign = aoa.length;
  const cSignRight = Math.ceil(colCount / 2);
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[0] = customer.name;
    row[cSignRight] = seller.name;
    aoa.push(row);
    merges.push({ s: { r: rSign, c: 0 }, e: { r: rSign, c: cSignRight - 1 } });
    merges.push({ s: { r: rSign, c: cSignRight }, e: { r: rSign, c: colCount - 1 } });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
    if (c === C_STT) return { wch: 5 };
    if (c === C_DATE) return { wch: 11 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c === C_BL || c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_TYPE) return { wch: 6 };
    if (c === C_TYPE) return { wch: 10 };
    if (c >= C_PICKUP && c <= C_DROPOFF) return { wch: 26 };
    if (c === C_NOTE) return { wch: 22 };

    if (c >= C_CHIHO0) {
      const slot = chiHoSlotAt(c);
      if (slot === 'invoiceNo') return { wch: 10 };
      if (slot === 'name') return { wch: 14 };
    }
    return { wch: 13 }; // fee / VAT / TỔNG CỘNG / chi hộ SỐ TIỀN
  });

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = (ws[ref] ?? (ws[ref] = { t: 's', v: '' })) as StyledCell;
    cell.s = { ...(cell.s ?? {}), ...style };
  };
  const setFmt = (r: number, c: number, z: string) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = ws[ref] as StyledCell | undefined;
    if (cell && cell.t === 'n') {
      cell.z = z;
      cell.s = { ...(cell.s ?? {}), alignment: { horizontal: 'right' } };
    }
  };
  const isMoneyCol = (c: number) =>
    (c >= C_FEE0 && c <= C_TOTAL) || (c >= C_CHIHO0 && chiHoSlotAt(c) === 'amount');

  setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  setStyle(rDear, 0, { font: { bold: true } });

  for (const r of [rHead1, rHead2]) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: HEADER_FILL,
        border: ALL_BORDERS,
      });
    }
  }

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'top', wrapText: true } });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    setStyle(r, C_STT, { alignment: { horizontal: 'center' } });
    setStyle(r, C_DATE, { alignment: { horizontal: 'center' } });
    setStyle(r, C_TYPE, { alignment: { horizontal: 'center' } });
    for (let s = 0; s < SIZE_BUCKETS.length; s++) {
      setStyle(r, C_SIZE0 + s, { alignment: { horizontal: 'center' } });
    }
  }

  for (let c = 0; c <= lastCol; c++) {
    setStyle(rTotalRow, c, { font: { bold: true }, border: ALL_BORDERS, fill: TOTAL_FILL });
    if (isMoneyCol(c)) setFmt(rTotalRow, c, FMT_MONEY_DASH);
  }

  for (let r = rFirstSummary; r >= 0 && r <= rLastSummary; r++) {
    setStyle(r, 0, { font: { bold: true }, alignment: { horizontal: 'right' } });
    setStyle(r, C_TOTAL, { font: { bold: true } });
    setFmt(r, C_TOTAL, FMT_MONEY);
  }

  for (const r of paymentLines) {
    setStyle(r, 0, {
      font: { bold: introRows.has(r), italic: introRows.has(r) },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
  }

  for (const c of [0, cSignRight]) {
    setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
};

export const buildCustomerReportType1: CustomerReportBuilder = (orders, input) =>
  buildBangKeSheet(orders, input, TYPE1_LAYOUT);
