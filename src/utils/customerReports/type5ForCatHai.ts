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
import { readTruckingSize } from '@/pages/transport-orders/truckingSize';

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;
const FMT_MONEY = '#,##0';
const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

const MANUAL_FILL = { fgColor: { rgb: 'FFFF00' } } as const;

type FooterNote = { text: string; value?: string; red?: boolean } | null;

type FooterAmount = 'service' | 'chiHo' | 'manual' | 'sum';
type PaymentFooter = {
  notes: ReadonlyArray<FooterNote>;
  box: ReadonlyArray<{ label: string; amount: FooterAmount }>;

  boxedAmounts: boolean;
};

const FREIGHT_TRANSFER_NOTE =
  'Vui lòng thanh toán cho công ty chúng tôi PHÍ VẬN CHUYỂN  trên bằng chuyển khoản theo thông tin:';
const VCB_ACCOUNT = '102 796 7777  Tại ngân hàng Vietcombank, Chi nhánh Hồ Chí Minh';

const EXPORT_FOOTER: PaymentFooter = {
  notes: [{ text: FREIGHT_TRANSFER_NOTE }, { text: `Số tài khoản: ${VCB_ACCOUNT}`, red: true }],
  box: [
    { label: 'Số tiền cước dịch vụ:', amount: 'service' },
    { label: 'Số tiền chi hộ ( Đã xuất cho Cát Hải)', amount: 'chiHo' },
    { label: 'Tổng thanh toán', amount: 'sum' },
  ],
  boxedAmounts: true,
};

const IMPORT_FOOTER: PaymentFooter = {
  notes: [
    { text: FREIGHT_TRANSFER_NOTE },
    { text: 'Công ty thụ hưởng: CÔNG TY CỔ PHẦN DỊCH VỤ THƯƠNG MẠI VÀ ĐẦU TƯ DŨNG UY', red: true },
    { text: 'Số tài khoản:', value: VCB_ACCOUNT, red: true },
    null,
    null,
    {
      text: 'Vui lòng thanh toán PHÍ CHI HỘ cho chúng tôi số tiền nêu trên bằng chuyển khoản theo thông tin:',
    },
    { text: 'Người thụ hưởng:', value: 'VÕ VĂN HÀO', red: true },
    {
      text: 'Số tài khoản:',
      value: '19038044220014 Tại Ngân hàng kỹ thương Việt Nam ( Techcombank)',
      red: true,
    },
  ],
  box: [
    { label: 'Số tiền cước vận chuyển:', amount: 'service' },
    { label: 'Số tiền chi hộ: Dũng Uy xuất lại', amount: 'manual' },
    { label: 'Phí neo', amount: 'manual' },
    { label: 'Số tiền chi hộ đã xuất cho Cát Hải', amount: 'chiHo' },
    { label: 'Tổng cộng thanh toán', amount: 'sum' },
  ],
  boxedAmounts: false,
};

const SIZE_BUCKETS = [
  { key: '20', header: "20'" },
  { key: '40', header: "40'" },
] as const;

const sizeBucketIndex = (truckingSize: string | undefined): number => {
  const digits = (truckingSize ?? '').trim().match(/^(\d+)/)?.[1];
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
  if (order.isMultiTrip) {
    for (const trip of order.trips ?? []) {
      const plate = truckLabel(trip.truckPlate, trip.truckId);
      if (plate) return plate;
    }
  }
  return truckLabel(order.truckPlate, order.truckId);
}

type Route = { pickup: string; stuffing: string; dropoff: string };

function routeOf(order: TransportOrder): Route {
  const stops: string[] = [];
  if (order.isMultiTrip) {
    for (const trip of order.trips ?? []) {
      for (const place of [trip.departure, trip.destination]) {
        const stop = (place ?? '').trim();
        if (stop && stops[stops.length - 1] !== stop) stops.push(stop);
      }
    }
  }
  if (stops.length === 0) {
    return {
      pickup: order.route?.pickup ?? '',
      stuffing: order.route?.stuffing ?? '',
      dropoff: order.route?.dropoff ?? '',
    };
  }
  const middle: string[] = [];
  for (const stop of stops.slice(1, -1)) if (!middle.includes(stop)) middle.push(stop);
  return { pickup: stops[0]!, stuffing: middle.join(', '), dropoff: stops[stops.length - 1]! };
}

const looseText = (text: string): string =>
  text.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');

const isShipmentType = (order: TransportOrder, value: string): boolean =>
  (order.shipmentType ?? '').trim().toUpperCase() === value;

const stuffingContains = (order: TransportOrder, warehouse: string): boolean =>
  looseText(routeOf(order).stuffing).includes(looseText(warehouse));

const SHEETS: ReadonlyArray<{
  name: string;
  includes: (order: TransportOrder) => boolean;

  footer: PaymentFooter;
}> = [
  { name: 'Hàng xuất', includes: (o) => isShipmentType(o, 'XUAT'), footer: EXPORT_FOOTER },
  {
    name: 'Hàng nhập - VS',
    includes: (o) => isShipmentType(o, 'NHAP') && stuffingContains(o, 'Kho VS (KCN Tân Đô)'),
    footer: IMPORT_FOOTER,
  },
  {
    name: 'Hàng nhập - OG',
    includes: (o) => isShipmentType(o, 'NHAP') && stuffingContains(o, 'Kho OG'),
    footer: IMPORT_FOOTER,
  },
];

export const buildCustomerReportType5: CustomerReportBuilder = (orders, input) => {
  const rows = orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));

  const sheets = SHEETS.map((sheet) => ({ ...sheet, rows: rows.filter(sheet.includes) }));
  const printed = rows.filter((o) => sheets.some((s) => s.rows.includes(o)));

  const periodLabel = bangKePeriodLabel(printed);

  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      buildSheet(sheet.rows, input, periodLabel, sheet.footer),
      sheet.name,
    );
  }

  return { workbook, rowCount: printed.length };
};

function buildSheet(
  rows: ReadonlyArray<TransportOrder>,
  {
    seller,
    customer,
    resolveShipmentType,

    resolveFeeName,
    getTruckPlate,
    titleSuffix,
  }: CustomerReportInput,
  periodLabel: string,
  footer: PaymentFooter,
): XLSX.WorkSheet {
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
  const rTitle = banner(`BẢNG KÊ VẬN CHUYỂN${suffix} ${periodLabel}`);
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
      const size = sizeBucketIndex(readTruckingSize(order));
      if (size >= 0) {
        row[C_SIZE0 + size] = 1;
        sizeCounts[size] += 1;
      }
      row[C_TYPE] = resolveShipmentType(order.shipmentType);
      const route = routeOf(order);
      row[C_FROM] = route.pickup;
      row[C_STUFFING] = route.stuffing;
      row[C_TO] = route.dropoff;

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
  const rFooter = aoa.length;
  {
    const service = sums.get(C_TOTAL) ?? 0;
    const chiHo = CHI_HO_COLUMNS.reduce((s, _c, i) => s + (sums.get(chiHoMoneyCol(i)) ?? 0), 0);

    const cached: Record<FooterAmount, number> = {
      service,
      chiHo,
      manual: 0,
      sum: service + chiHo,
    };
    const height = Math.max(footer.notes.length, footer.box.length);
    for (let i = 0; i < height; i++) {
      const r = aoa.length;
      const row: CellValue[] = new Array(colCount).fill('');
      const note = footer.notes[i];
      if (note && note.value === undefined) {
        row[C_DATE] = note.text;
        merges.push({ s: { r, c: C_DATE }, e: { r, c: C_XLHN } });
      } else if (note) {
        row[C_DATE] = note.text;
        row[C_ORDER_NO] = note.value!;
        merges.push({ s: { r, c: C_DATE }, e: { r, c: C_TRUCK } });
        merges.push({ s: { r, c: C_ORDER_NO }, e: { r, c: C_XLHN } });
      }
      const line = footer.box[i];
      if (line) {
        row[C_POWER] = line.label;
        if (line.amount !== 'manual') row[C_TOTAL] = cached[line.amount];
        merges.push({ s: { r, c: C_POWER }, e: { r, c: C_VAT } });
      }
      aoa.push(row);
    }
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

  {
    const red = { font: { color: { rgb: 'FF0000' } } };
    footer.notes.forEach((note, i) => {
      if (!note?.red) return;
      setStyle(rFooter + i, C_DATE, red);
      if (note.value !== undefined) setStyle(rFooter + i, C_ORDER_NO, red);
    });

    const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
    const lastBoxCol = footer.boxedAmounts ? C_TOTAL : C_VAT;
    footer.box.forEach((line, i) => {
      const r = rFooter + i;
      for (let c = C_POWER; c <= lastBoxCol; c++) {
        setStyle(r, c, { font: { bold: true }, border: ALL_BORDERS });
      }
      if (line.amount === 'manual') {
        setStyle(r, C_TOTAL, { fill: MANUAL_FILL });
        return;
      }
      (ws[ref(r, C_TOTAL)] as StyledCell).f =
        line.amount === 'service'
          ? ref(rTotalRow, C_TOTAL)
          : line.amount === 'chiHo'
            ? CHI_HO_COLUMNS.map((_c, k) => ref(rTotalRow, chiHoMoneyCol(k))).join('+')
            : `SUM(${ref(rFooter, C_TOTAL)}:${ref(r - 1, C_TOTAL)})`;
      setFmt(r, C_TOTAL, FMT_MONEY);
    });
  }

  for (const c of [0, cSignRight]) {
    setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
  }

  return ws;
}
