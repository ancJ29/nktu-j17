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

type FooterAmount = 'service' | 'chiHo' | 'moor' | 'manual' | 'sum';
type PaymentFooter = {
  notes: ReadonlyArray<FooterNote>;
  box: ReadonlyArray<{ label: string; amount: FooterAmount }>;

  boxedAmounts: boolean;
};

const FREIGHT_TRANSFER_NOTE =
  'Vui lòng thanh toán cho công ty chúng tôi PHÍ VẬN CHUYỂN  trên bằng chuyển khoản theo thông tin:';
const VCB_ACCOUNT = '102 796 7777  Tại ngân hàng Vietcombank, Chi nhánh Hồ Chí Minh';

const SHORT_FOOTER: PaymentFooter = {
  notes: [{ text: FREIGHT_TRANSFER_NOTE }, { text: `Số tài khoản: ${VCB_ACCOUNT}`, red: true }],
  box: [
    { label: 'Số tiền cước dịch vụ:', amount: 'service' },
    { label: 'Số tiền chi hộ ( Đã xuất cho Cát Hải)', amount: 'chiHo' },
    { label: 'Tổng thanh toán', amount: 'sum' },
  ],
  boxedAmounts: true,
};

const FULL_FOOTER: PaymentFooter = {
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

    { label: 'Phí neo', amount: 'moor' },
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

type Type5FeeColumn =
  'freight' | 'sitc' | 'xlhn' | 'power' | 'moor' | 'lift' | 'drop' | 'emptyReturn' | 'earlyDrop';

const FEE_NAMES: Record<Type5FeeColumn, string> = {
  freight: 'PHI_VAN_CHUYEN',
  sitc: 'VE_TRAM_PHU_HUU',
  xlhn: 'VE_TRAM_XLHN',
  power: 'PHI_DIEN_KHOAN',
  moor: 'PHI_LUU_MOC',
  lift: 'PHI_NANG',
  drop: 'PHI_HA',
  emptyReturn: 'PHU_THU_HA_RONG',
  earlyDrop: 'PHI_HA_SOM',
};

type FeeHeader = { column: Type5FeeColumn; header: string };

type SheetLayout = {
  moorDates: boolean;
  orderNoHeader: string;

  service: ReadonlyArray<FeeHeader>;

  moorFee: boolean;
  chiHoTitle: string;

  chiHo: ReadonlyArray<FeeHeader>;

  chiHoNote?: string;

  trailing: ReadonlyArray<{ header: string; manual: boolean }>;
};

const IMPORT_LAYOUT: SheetLayout = {
  moorDates: false,
  orderNoHeader: 'MÃ LỆNH',
  service: [
    { column: 'freight', header: 'PHÍ VẬN CHUYỂN' },
    { column: 'sitc', header: 'Phí SITC' },
    { column: 'xlhn', header: 'Phí XLHN' },
    { column: 'power', header: 'PHÍ ĐIỆN' },
  ],
  moorFee: false,

  chiHoTitle: 'DŨNG UY CHI HỘ (HD KHÁCH)',
  chiHo: [
    { column: 'lift', header: 'PHÍ NÂNG' },
    { column: 'drop', header: 'PHÍ HẠ' },
    { column: 'emptyReturn', header: 'PHỤ THU HẠ RỖNG' },
  ],
  trailing: [
    { header: 'Note điện OG chịu', manual: true },
    { header: 'TIỀN CƯỢC CONT', manual: true },
    { header: 'Nguyên nhân phát sinh', manual: true },
  ],
};

const EXPORT_LAYOUT: SheetLayout = {
  moorDates: true,
  orderNoHeader: 'Mã Lệnh',
  service: [
    { column: 'freight', header: 'PHÍ VẬN CHUYỂN' },
    { column: 'sitc', header: 'PHÍ SITC' },
    { column: 'xlhn', header: 'Phí XLHN' },
  ],
  moorFee: true,

  chiHoTitle: '',
  chiHo: [
    { column: 'lift', header: 'PHÍ NÂNG' },
    { column: 'drop', header: 'PHÍ HẠ' },
    { column: 'earlyDrop', header: 'PHÍ HẠ SỚM' },
  ],
  chiHoNote: 'Note hoá đơn',
  trailing: [{ header: 'Note', manual: false }],
};

const layoutColumns = (layout: SheetLayout): Type5FeeColumn[] => [
  ...layout.service.map((s) => s.column),
  ...(layout.moorFee ? (['moor'] as const) : []),
  ...layout.chiHo.map((c) => c.column),
];

function feeColumnReader(
  resolveFeeName: (value: string) => string,
  columns: ReadonlyArray<Type5FeeColumn>,
): (label: string) => Type5FeeColumn | undefined {
  const byKey = new Map<string, Type5FeeColumn>();
  for (const column of columns) {
    const value = FEE_NAMES[column];
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
  layout: SheetLayout,
): OrderMoney {
  const amounts = Object.fromEntries(
    (Object.keys(FEE_NAMES) as Type5FeeColumn[]).map((column) => [column, 0]),
  ) as Record<Type5FeeColumn, number>;
  const service = new Set(layout.service.map((s) => s.column));
  const chiHo = new Set(layout.chiHo.map((c) => c.column));
  const invoiceNos: Partial<Record<Type5FeeColumn, string[]>> = {};
  let vatBase = 0;

  for (const fee of readFeeLines(order)) {
    if (!isBillableFee(fee)) continue;
    const column = columnOf(fee.label);
    if (!column) continue;
    const amount = (fee as TransportOrderFee).amount || 0;
    amounts[column] += amount;
    if (service.has(column)) {
      if (fee.vatable) vatBase += amount;
    } else if (chiHo.has(column) && fee.invoiceNo) {
      (invoiceNos[column] ??= []).push(fee.invoiceNo);
    }
  }

  const vat = roundVat(vatBase * (order.vatRate || 0), !!order.roundDown);
  const invoices = {} as Record<Type5FeeColumn, string>;
  for (const column of Object.keys(FEE_NAMES) as Type5FeeColumn[]) {
    invoices[column] = (invoiceNos[column] ?? []).join(', ');
  }

  return {
    amounts,
    invoices,
    vat,
    total: layout.service.reduce((sum, { column }) => sum + amounts[column], 0) + vat,
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
  layout: SheetLayout;

  footer: PaymentFooter;
}> = [
  {
    name: 'Hàng nhập',
    includes: (o) => isShipmentType(o, 'NHAP'),
    layout: IMPORT_LAYOUT,
    footer: SHORT_FOOTER,
  },
  {
    name: 'Hàng xuất - VS',
    includes: (o) => isShipmentType(o, 'XUAT') && stuffingContains(o, 'Kho VS (KCN Tân Đô)'),
    layout: EXPORT_LAYOUT,
    footer: FULL_FOOTER,
  },
  {
    name: 'Hàng xuất - OG',
    includes: (o) => isShipmentType(o, 'XUAT') && stuffingContains(o, 'Kho OG'),
    layout: EXPORT_LAYOUT,
    footer: FULL_FOOTER,
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
      buildSheet(sheet.rows, input, periodLabel, sheet.layout, sheet.footer),
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
  layout: SheetLayout,
  footer: PaymentFooter,
): XLSX.WorkSheet {
  const columnOf = feeColumnReader(resolveFeeName, layoutColumns(layout));
  const truckLabel = (name: string, truckId: string | undefined) => getTruckPlate(truckId) ?? name;

  let cursor = 0;
  const take = (width = 1) => {
    const c = cursor;
    cursor += width;
    return c;
  };
  const C_STT = take();
  const C_DATE = take();
  const C_REQ_DATE = layout.moorDates ? take() : -1;
  const C_DROP_DATE = layout.moorDates ? take() : -1;
  const C_MOOR_DAYS = layout.moorDates ? take() : -1;
  const C_TRUCK = take();
  const C_ORDER_NO = take();
  const C_CONT = take();
  const C_SIZE0 = take(SIZE_BUCKETS.length);
  const C_TYPE = take();
  const C_FROM = take();
  const C_STUFFING = take();
  const C_TO = take();
  const C_SERVICE0 = take(layout.service.length);
  const C_VAT = take();
  const C_TOTAL = take();
  const C_MOOR = layout.moorFee ? take() : -1;

  const C_CHI_HO0 = take(layout.chiHo.length * 2);
  const C_CHI_HO_NOTE = layout.chiHoNote ? take() : -1;
  const C_TRAILING0 = take(layout.trailing.length);
  const colCount = cursor;
  const lastCol = colCount - 1;
  const chiHoMoneyCol = (i: number) => C_CHI_HO0 + i * 2;

  const MANUAL_COLS = layout.trailing.flatMap((col, i) => (col.manual ? [C_TRAILING0 + i] : []));
  const moneyCols = [
    ...layout.service.map((_s, i) => C_SERVICE0 + i),
    C_VAT,
    C_TOTAL,
    ...(C_MOOR >= 0 ? [C_MOOR] : []),
    ...layout.chiHo.map((_c, i) => chiHoMoneyCol(i)),
  ];
  const centeredCols = [C_STT, C_DATE, C_REQ_DATE, C_DROP_DATE, C_MOOR_DAYS, C_TYPE].filter(
    (c) => c >= 0,
  );

  const C_BOX_LABEL0 = layout.moorFee ? C_TOTAL : C_VAT - 1;
  const C_BOX_LABEL1 = C_BOX_LABEL0 + 1;
  const C_BOX_AMOUNT = C_BOX_LABEL1 + 1;
  const C_NOTE_VALUE = C_DATE + 2;
  const C_NOTE_END = C_BOX_LABEL0 - 1;

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
  if (layout.moorDates) {
    leaf(C_REQ_DATE, 'NGÀY YÊU CẦU LẤY');
    leaf(C_DROP_DATE, 'NGÀY HẠ');
    leaf(C_MOOR_DAYS, 'SỐ NGÀY LƯU MOOR');
  }
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_ORDER_NO, layout.orderNoHeader);
  leaf(C_CONT, 'SỐ CONT');
  group(
    C_SIZE0,
    C_SIZE0 + SIZE_BUCKETS.length - 1,
    'SẢN LƯỢNG',
    SIZE_BUCKETS.map((b) => b.header),
  );
  leaf(C_TYPE, 'LOẠI HÌNH');
  group(C_FROM, C_TO, 'TUYẾN DỊCH VỤ', ['NƠI LẤY', 'NƠI ĐÓNG/RÚT HÀNG', 'NƠI HẠ']);
  group(C_SERVICE0, C_VAT, 'CƯỚC DỊCH VỤ', [
    ...layout.service.map((s) => s.header),
    vatHeader(rows),
  ]);
  leaf(C_TOTAL, 'TỔNG CỘNG');
  if (C_MOOR >= 0) leaf(C_MOOR, 'PHÍ LƯU MOOR');
  group(
    C_CHI_HO0,
    C_CHI_HO_NOTE >= 0 ? C_CHI_HO_NOTE : C_CHI_HO0 + layout.chiHo.length * 2 - 1,
    layout.chiHoTitle,
    [
      ...layout.chiHo.flatMap((c) => [c.header, 'SỐ HĐ']),
      ...(layout.chiHoNote ? [layout.chiHoNote] : []),
    ],
  );
  layout.trailing.forEach((col, i) => leaf(C_TRAILING0 + i, col.header));
  aoa.push(head1, head2);

  const sums = new Map<number, number>();
  const addSum = (col: number, amount: number) => sums.set(col, (sums.get(col) ?? 0) + amount);
  const sizeCounts = SIZE_BUCKETS.map(() => 0);

  const rFirstData = aoa.length;
  let stt = 0;
  for (const group of groupByLenh(rows)) {
    const rBlockStart = aoa.length;

    for (const order of group) {
      const money = readOrderMoney(order, columnOf, layout);
      const row: CellValue[] = new Array(colCount).fill('');
      row[C_STT] = ++stt;
      row[C_DATE] = formatDate(orderPlanDate(order));
      if (layout.moorDates) {
        const { requestedPickupDate, dropoffDate, moocStorageDays } = order.extra ?? {};
        if (typeof requestedPickupDate === 'string' && requestedPickupDate) {
          row[C_REQ_DATE] = formatDate(requestedPickupDate);
        }
        if (typeof dropoffDate === 'string' && dropoffDate) {
          row[C_DROP_DATE] = formatDate(dropoffDate);
        }

        if (typeof moocStorageDays === 'number') row[C_MOOR_DAYS] = moocStorageDays;
      }
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

      const putMoney = (c: number, amount: number) => {
        if (amount !== 0) row[c] = amount;
        addSum(c, amount);
      };
      layout.service.forEach(({ column }, i) => putMoney(C_SERVICE0 + i, money.amounts[column]));
      putMoney(C_VAT, money.vat);
      putMoney(C_TOTAL, money.total);
      if (C_MOOR >= 0) putMoney(C_MOOR, money.amounts.moor);
      layout.chiHo.forEach(({ column }, i) => {
        const c = chiHoMoneyCol(i);
        putMoney(c, money.amounts[column]);
        if (money.invoices[column]) row[c + 1] = money.invoices[column];
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
    const chiHo = layout.chiHo.reduce((s, _c, i) => s + (sums.get(chiHoMoneyCol(i)) ?? 0), 0);
    const moor = C_MOOR >= 0 ? (sums.get(C_MOOR) ?? 0) : 0;

    const cached: Record<FooterAmount, number> = {
      service,
      chiHo,
      moor,
      manual: 0,
      sum: service + chiHo + moor,
    };
    const height = Math.max(footer.notes.length, footer.box.length);
    for (let i = 0; i < height; i++) {
      const r = aoa.length;
      const row: CellValue[] = new Array(colCount).fill('');
      const note = footer.notes[i];
      if (note && note.value === undefined) {
        row[C_DATE] = note.text;
        merges.push({ s: { r, c: C_DATE }, e: { r, c: C_NOTE_END } });
      } else if (note) {
        row[C_DATE] = note.text;
        row[C_NOTE_VALUE] = note.value!;
        merges.push({ s: { r, c: C_DATE }, e: { r, c: C_NOTE_VALUE - 1 } });
        merges.push({ s: { r, c: C_NOTE_VALUE }, e: { r, c: C_NOTE_END } });
      }
      const line = footer.box[i];
      if (line) {
        row[C_BOX_LABEL0] = line.label;
        if (line.amount !== 'manual') row[C_BOX_AMOUNT] = cached[line.amount];
        merges.push({ s: { r, c: C_BOX_LABEL0 }, e: { r, c: C_BOX_LABEL1 } });
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
    if (c === C_DATE || c === C_REQ_DATE || c === C_DROP_DATE) return { wch: 11 };
    if (c === C_MOOR_DAYS) return { wch: 9 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c === C_ORDER_NO) return { wch: 34 };
    if (c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_TYPE) return { wch: 6 };
    if (c === C_TYPE) return { wch: 11 };
    if (c >= C_FROM && c <= C_TO) return { wch: 24 };
    if (c === C_TOTAL) return { wch: 16 };
    if (c === lastCol) return { wch: 26 };
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
    for (const c of centeredCols) setStyle(r, c, { alignment: { horizontal: 'center' } });
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
      if (note.value !== undefined) setStyle(rFooter + i, C_NOTE_VALUE, red);
    });

    const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
    const lastBoxCol = footer.boxedAmounts ? C_BOX_AMOUNT : C_BOX_LABEL1;
    footer.box.forEach((line, i) => {
      const r = rFooter + i;
      for (let c = C_BOX_LABEL0; c <= lastBoxCol; c++) {
        setStyle(r, c, { font: { bold: true }, border: ALL_BORDERS });
      }
      if (line.amount === 'manual') {
        setStyle(r, C_BOX_AMOUNT, { fill: MANUAL_FILL });
        return;
      }
      const formula: Record<Exclude<FooterAmount, 'manual'>, string> = {
        service: ref(rTotalRow, C_TOTAL),
        chiHo: layout.chiHo.map((_c, k) => ref(rTotalRow, chiHoMoneyCol(k))).join('+'),
        moor: C_MOOR >= 0 ? ref(rTotalRow, C_MOOR) : '0',
        sum: `SUM(${ref(rFooter, C_BOX_AMOUNT)}:${ref(r - 1, C_BOX_AMOUNT)})`,
      };
      (ws[ref(r, C_BOX_AMOUNT)] as StyledCell).f = formula[line.amount];
      setFmt(r, C_BOX_AMOUNT, FMT_MONEY);
    });
  }

  for (const c of [0, cSignRight]) {
    setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
  }

  return ws;
}
