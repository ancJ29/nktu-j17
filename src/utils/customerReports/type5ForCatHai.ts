import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  readFeeLines,
  roundVat,
} from '@/pages/transport-orders/transportOrderPricing';
import { bangKePeriodLabel } from './type1BangKe';
import type { CustomerReportBuilder, CustomerReportInput } from './types';

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;
const FMT_MONEY = '#,##0';
const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

const MANUAL_FILL = { fgColor: { rgb: 'FFFF00' } } as const;

const SIZE_BUCKETS = [
  { key: '20', header: "20'" },
  { key: '40', header: "40'" },
] as const;

const sizeBucketIndex = (containerSize: string | undefined): number => {
  const digits = (containerSize ?? '').trim().match(/^(\d+)/)?.[1];
  return digits ? SIZE_BUCKETS.findIndex((b) => b.key === digits) : -1;
};

type Type5FeeColumn = 'freight' | 'sitc' | 'xlhn' | 'power' | 'lift' | 'drop' | 'emptyReturn';

const FEE_COLUMNS: ReadonlyArray<{ column: Type5FeeColumn; value: string }> = [
  { column: 'freight', value: 'PHI_VAN_CHUYEN' },
  { column: 'sitc', value: 'VE_TRAM_PHU_HUU' },
  { column: 'xlhn', value: 'VE_TRAM_XLHN' },
  { column: 'power', value: 'PHI_DIEN_KHOAN' },
  { column: 'lift', value: 'PHI_NANG' },
  { column: 'drop', value: 'PHI_HA' },
  { column: 'emptyReturn', value: 'PHU_THU_HA_RONG' },
];

const SERVICE_COLUMNS: ReadonlySet<Type5FeeColumn> = new Set<Type5FeeColumn>([
  'freight',
  'sitc',
  'xlhn',
  'power',
]);

const CHI_HO_COLUMNS: ReadonlyArray<{ column: Type5FeeColumn; header: string }> = [
  { column: 'lift', header: 'PHÍ NÂNG' },
  { column: 'drop', header: 'PHÍ HẠ' },
  { column: 'emptyReturn', header: 'PHỤ THU HẠ RỖNG' },
];

function feeColumnReader(
  resolveFeeName: (value: string) => string,
): (label: string) => Type5FeeColumn | undefined {
  const byKey = new Map<string, Type5FeeColumn>();
  for (const { column, value } of FEE_COLUMNS) {
    byKey.set(feeKey(value), column);
    byKey.set(feeKey(resolveFeeName(value)), column);
  }
  return (label: string) => byKey.get(feeKey(label)) ?? byKey.get(feeKey(resolveFeeName(label)));
}

type OrderMoney = {
  amounts: Record<Type5FeeColumn, number>;
  invoices: Record<Type5FeeColumn, string>;
  vat: number;
  total: number;
};

function readOrderMoney(
  order: TransportOrder,
  columnOf: (label: string) => Type5FeeColumn | undefined,
): OrderMoney {
  const amounts = {
    freight: 0,
    sitc: 0,
    xlhn: 0,
    power: 0,
    lift: 0,
    drop: 0,
    emptyReturn: 0,
  } as Record<Type5FeeColumn, number>;
  const invoiceNos: Record<string, string[]> = {};
  let vatBase = 0;

  for (const fee of readFeeLines(order)) {
    if (!isBillableFee(fee)) continue;
    const column = columnOf(fee.label);
    if (!column) continue;
    const amount = (fee as TransportOrderFee).amount || 0;
    amounts[column] += amount;
    if (SERVICE_COLUMNS.has(column)) {
      if (fee.vatable) vatBase += amount;
    } else if (fee.invoiceNo) {
      (invoiceNos[column] ??= []).push(fee.invoiceNo);
    }
  }

  const vat = roundVat(vatBase * (order.vatRate || 0), !!order.roundDown);
  const invoices = {} as Record<Type5FeeColumn, string>;
  for (const { column } of FEE_COLUMNS) {
    invoices[column] = (invoiceNos[column] ?? []).join(', ');
  }

  return {
    amounts,
    invoices,
    vat,
    total: amounts.freight + amounts.sitc + amounts.xlhn + amounts.power + vat,
  };
}

function vatHeader(orders: ReadonlyArray<TransportOrder>): string {
  const rates = new Set(orders.map((o) => o.vatRate || 0));
  if (rates.size !== 1) return 'VAT';
  const rate = [...rates][0]!;
  return `VAT ${+(rate * 100).toFixed(2)}%`;
}

const lenhKey = (code: string): string => code.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');

function groupByLenh(rows: ReadonlyArray<TransportOrder>): TransportOrder[][] {
  const groups: TransportOrder[][] = [];
  const byLenh = new Map<string, TransportOrder[]>();
  for (const order of rows) {
    const key = lenhKey(order.extra?.customerOrderNumber ?? '');
    if (!key) {
      groups.push([order]);
      continue;
    }
    const existing = byLenh.get(key);
    if (existing) {
      existing.push(order);
      continue;
    }
    const group = [order];
    byLenh.set(key, group);
    groups.push(group);
  }
  return groups;
}

function plateOf(
  order: TransportOrder,
  truckLabel: (name: string, truckId: string | undefined) => string,
): string {
  if (!order.isMultiTrip || (order.trips?.length ?? 0) === 0) {
    return truckLabel(order.truckPlate, order.truckId);
  }
  const plates: string[] = [];
  for (const trip of order.trips!) {
    const plate = truckLabel(trip.truckPlate, trip.truckId);
    if (plate && !plates.includes(plate)) plates.push(plate);
  }
  return plates.join('; ');
}

export const buildCustomerReportType5: CustomerReportBuilder = (
  orders,
  {
    seller,
    customer,
    resolveShipmentType,

    resolveFeeName,
    getTruckPlate,
    titleSuffix,
  }: CustomerReportInput,
) => {
  const rows = orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));

  const columnOf = feeColumnReader(resolveFeeName);
  const truckLabel = (name: string, truckId: string | undefined) => getTruckPlate(truckId) ?? name;

  const C_STT = 0;
  const C_DATE = 1;
  const C_TRUCK = 2;
  const C_ORDER_NO = 3;
  const C_CONT = 4;
  const C_SIZE0 = 5;
  const C_TYPE = C_SIZE0 + SIZE_BUCKETS.length;
  const C_FROM = C_TYPE + 1;
  const C_STUFFING = C_FROM + 1;
  const C_TO = C_STUFFING + 1;
  const C_FREIGHT = C_TO + 1;
  const C_SITC = C_FREIGHT + 1;
  const C_XLHN = C_SITC + 1;
  const C_POWER = C_XLHN + 1;
  const C_VAT = C_POWER + 1;
  const C_TOTAL = C_VAT + 1;

  const C_CHI_HO0 = C_TOTAL + 1;
  const C_NOTE = C_CHI_HO0 + CHI_HO_COLUMNS.length * 2;
  const C_DEPOSIT = C_NOTE + 1;
  const C_REASON = C_DEPOSIT + 1;
  const colCount = C_REASON + 1;
  const lastCol = colCount - 1;
  const chiHoMoneyCol = (i: number) => C_CHI_HO0 + i * 2;

  const MANUAL_COLS = [C_NOTE, C_DEPOSIT, C_REASON];
  const moneyCols = [
    C_FREIGHT,
    C_SITC,
    C_XLHN,
    C_POWER,
    C_VAT,
    C_TOTAL,
    ...CHI_HO_COLUMNS.map((_c, i) => chiHoMoneyCol(i)),
  ];

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
  leaf(C_ORDER_NO, 'MÃ LỆNH');
  leaf(C_CONT, 'SỐ CONT');
  group(
    C_SIZE0,
    C_SIZE0 + SIZE_BUCKETS.length - 1,
    'SẢN LƯỢNG',
    SIZE_BUCKETS.map((b) => b.header),
  );
  leaf(C_TYPE, 'LOẠI HÌNH');
  group(C_FROM, C_TO, 'TUYẾN DỊCH VỤ', ['NƠI LẤY', 'NƠI ĐÓNG/RÚT HÀNG', 'NƠI HẠ']);
  group(C_FREIGHT, C_VAT, 'CƯỚC DỊCH VỤ', [
    'PHÍ VẬN CHUYỂN',
    'Phí SITC',
    'Phí XLHN',
    'PHÍ ĐIỆN',
    vatHeader(rows),
  ]);
  leaf(C_TOTAL, 'TỔNG CỘNG');

  group(
    C_CHI_HO0,
    C_CHI_HO0 + CHI_HO_COLUMNS.length * 2 - 1,
    'DŨNG UY CHI HỘ (HD KHÁCH)',
    CHI_HO_COLUMNS.flatMap((c) => [c.header, 'SỐ HĐ']),
  );
  leaf(C_NOTE, 'Note điện OG chịu');
  leaf(C_DEPOSIT, 'TIỀN CƯỢC CONT');
  leaf(C_REASON, 'Nguyên nhân phát sinh');
  aoa.push(head1, head2);

  const sums = new Map<number, number>();
  const addSum = (col: number, amount: number) => sums.set(col, (sums.get(col) ?? 0) + amount);
  const sizeCounts = SIZE_BUCKETS.map(() => 0);

  const rFirstData = aoa.length;
  let stt = 0;
  for (const group of groupByLenh(rows)) {
    const rBlockStart = aoa.length;

    for (const order of group) {
      const money = readOrderMoney(order, columnOf);
      const row: CellValue[] = new Array(colCount).fill('');
      row[C_STT] = ++stt;
      row[C_DATE] = formatDate(orderPlanDate(order));
      row[C_TRUCK] = plateOf(order, truckLabel);
      row[C_CONT] = order.containerNumber ?? '';
      const size = sizeBucketIndex(order.containerSize);
      if (size >= 0) {
        row[C_SIZE0 + size] = 1;
        sizeCounts[size] += 1;
      }
      row[C_TYPE] = resolveShipmentType(order.shipmentType);
      row[C_FROM] = order.route?.pickup ?? '';
      row[C_STUFFING] = order.route?.stuffing ?? '';
      row[C_TO] = order.route?.dropoff ?? '';

      if (money.amounts.freight !== 0) row[C_FREIGHT] = money.amounts.freight;
      if (money.amounts.sitc !== 0) row[C_SITC] = money.amounts.sitc;
      if (money.amounts.xlhn !== 0) row[C_XLHN] = money.amounts.xlhn;
      if (money.amounts.power !== 0) row[C_POWER] = money.amounts.power;
      if (money.vat !== 0) row[C_VAT] = money.vat;
      if (money.total !== 0) row[C_TOTAL] = money.total;
      addSum(C_FREIGHT, money.amounts.freight);
      addSum(C_SITC, money.amounts.sitc);
      addSum(C_XLHN, money.amounts.xlhn);
      addSum(C_POWER, money.amounts.power);
      addSum(C_VAT, money.vat);
      addSum(C_TOTAL, money.total);
      CHI_HO_COLUMNS.forEach(({ column }, i) => {
        const amount = money.amounts[column];
        const c = chiHoMoneyCol(i);
        if (amount !== 0) row[c] = amount;
        if (money.invoices[column]) row[c + 1] = money.invoices[column];
        addSum(c, amount);
      });

      aoa.push(row);
    }

    aoa[rBlockStart]![C_ORDER_NO] = group[0]!.extra?.customerOrderNumber ?? '';
    if (group.length > 1) {
      merges.push({
        s: { r: rBlockStart, c: C_ORDER_NO },
        e: { r: aoa.length - 1, c: C_ORDER_NO },
      });
    }
  }
  const rLastData = aoa.length - 1;

  const rTotalRow = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_STT] = 'TOTAL';
    SIZE_BUCKETS.forEach((_b, k) => {
      row[C_SIZE0 + k] = sizeCounts[k]!;
    });
    for (const c of moneyCols) row[c] = sums.get(c) ?? 0;
    aoa.push(row);
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
    if (c === C_ORDER_NO) return { wch: 34 };
    if (c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_TYPE) return { wch: 6 };
    if (c === C_TYPE) return { wch: 11 };
    if (c >= C_FROM && c <= C_TO) return { wch: 24 };
    if (c === C_TOTAL) return { wch: 16 };
    if (c === C_REASON) return { wch: 26 };
    return { wch: 15 };
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

  setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  setStyle(rDear, 0, { font: { bold: true } });

  for (const r of [rHead1, rHead2]) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, {
        font: { bold: true },

        fill: MANUAL_COLS.includes(c) ? MANUAL_FILL : HEADER_FILL,
        border: ALL_BORDERS,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      });
    }
  }

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'center' } });
      if (MANUAL_COLS.includes(c)) setStyle(r, c, { fill: MANUAL_FILL });
      if (moneyCols.includes(c)) setFmt(r, c, FMT_MONEY);
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
    if (moneyCols.includes(c)) setFmt(rTotalRow, c, FMT_MONEY_DASH);
  }

  for (const c of [0, cSignRight]) {
    setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');

  return { workbook, rowCount: rows.length };
};
