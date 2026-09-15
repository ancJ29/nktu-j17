import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  orderTotals,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import type { CustomerReportBuilder } from './types';
import { readTruckingSize } from '@/pages/transport-orders/truckingSize';
import {
  ALL_BORDERS,
  FMT_MONEY,
  HEADER_FILL,
  MANUAL_FILL,
  bangKePeriodLabel,
  bangKeTitle,
  createSheetWriter,
  joinedPlates,
  makeStyler,
  sizeBucketIndex,
  statementRows,
  truckLabeler,
  type CellValue,
  type StyledCell,
} from './sheetKit';

const SIZE_BUCKETS = ["20'", "40'"] as const;

type Type6FeeColumn = 'freight' | 'toll' | 'offRoute';

const SERVICE_COLUMNS: ReadonlyArray<{ column: Type6FeeColumn; header: string }> = [
  { column: 'freight', header: 'PHÍ VẬN CHUYỂN' },
  { column: 'toll', header: 'VÉ TRẠM' },
  { column: 'offRoute', header: 'PHÍ TRÁI TUYẾN' },
];

const FEE_NAMES: Record<Exclude<Type6FeeColumn, 'freight'>, ReadonlyArray<string>> = {
  toll: ['PHI_TRAM', 'VE_TRAM_PHU_HUU', 'VE_TRAM_XLHN'],
  offRoute: ['PHI_TRAI_TUYEN'],
};

function serviceColumnReader(
  resolveFeeName: (value: string) => string,
): (label: string) => Type6FeeColumn {
  const byKey = new Map<string, Type6FeeColumn>();
  for (const [column, values] of Object.entries(FEE_NAMES) as Array<
    [Type6FeeColumn, ReadonlyArray<string>]
  >) {
    for (const value of values) {
      byKey.set(feeKey(value), column);
      byKey.set(feeKey(resolveFeeName(value)), column);
    }
  }
  return (label) =>
    byKey.get(feeKey(label)) ?? byKey.get(feeKey(resolveFeeName(label))) ?? 'freight';
}

const CHI_HO_VAT_RATE = 0.08;

function splitChiHoVat(gross: number): { before: number; vat: number } {
  const before = Math.round(gross / (1 + CHI_HO_VAT_RATE));
  return { before, vat: gross - before };
}

const CHI_HO_GROUP_HEADERS = [
  'SỐ TIỀN TRƯỚC VAT',
  'VAT',
  'SỐ TIỀN SAU VAT',
  'SỐ HĐ',
  'TÊN PHÍ',
] as const;
const CHI_HO_GROUP_WIDTH = CHI_HO_GROUP_HEADERS.length;

export const buildCustomerReportType6: CustomerReportBuilder = (
  orders,
  {
    seller,
    customer,
    resolveShipmentType,

    resolveFeeName,
    getTruckPlate,
    titleSuffix,
  },
) => {
  const rows = statementRows(orders);
  const columnOf = serviceColumnReader(resolveFeeName);
  const truckLabel = truckLabeler(getTruckPlate);

  const chiHoLines = (o: TransportOrder): TransportOrderFee[] =>
    readFeeLines(o)
      .filter((f) => f.kind === 'passthrough' && isBillableFee(f) && (f.amount || 0) !== 0)
      .map((f) => ({ ...f, label: resolveFeeName(f.label) }));

  const groups = Math.max(1, ...rows.map((o) => chiHoLines(o).length));

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
  const C_VAT = C_FEE0 + SERVICE_COLUMNS.length;
  const C_TOTAL = C_VAT + 1;
  const C_CONTRACT = C_TOTAL + 1;
  const C_CHI_HO0 = C_CONTRACT + 1;

  const C_KHACH_AMOUNT = C_CHI_HO0 + groups * CHI_HO_GROUP_WIDTH;
  const C_KHACH_INVOICE = C_KHACH_AMOUNT + 1;
  const C_NOTE = C_KHACH_INVOICE + 1;
  const colCount = C_NOTE + 1;
  const lastCol = colCount - 1;

  const groupCol = (g: number, slot: number) => C_CHI_HO0 + g * CHI_HO_GROUP_WIDTH + slot;
  const MANUAL_COLS = [C_KHACH_AMOUNT, C_KHACH_INVOICE];
  const moneyCols = [
    ...SERVICE_COLUMNS.map((_s, i) => C_FEE0 + i),
    C_VAT,
    C_TOTAL,
    ...Array.from({ length: groups }, (_, g) => [
      groupCol(g, 0),
      groupCol(g, 1),
      groupCol(g, 2),
    ]).flat(),
    C_KHACH_AMOUNT,
  ];

  const sheet = createSheetWriter(colCount);
  const { aoa, merges, blankRow, banner } = sheet;

  const rSeller = banner(seller.name);
  banner(seller.address);
  banner(`MST: ${seller.taxCode}`);
  const rTitle = banner(bangKeTitle(titleSuffix, bangKePeriodLabel(rows)));
  const rInvoiceRef = banner('Kèm theo hóa đơn số ….....ngày …......');
  const rDear = banner(`Kính gửi: ${customer.name}`);
  banner(`Địa chỉ: ${customer.address ?? ''}`);
  banner(`MST: ${customer.taxCode ?? ''}`);
  blankRow();

  const { rHead1, rHead2, leaf, group } = sheet.headerBand();
  leaf(C_STT, 'STT');
  leaf(C_DATE, 'NGÀY V/C');
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_BL, 'SỐ B/L; B/K');
  leaf(C_CONT, 'SỐ CONT');
  group(C_SIZE0, C_SIZE0 + SIZE_BUCKETS.length - 1, 'SẢN LƯỢNG', [...SIZE_BUCKETS]);
  leaf(C_TYPE, 'LOẠI HÌNH');
  group(C_PICKUP, C_DROPOFF, 'TUYẾN DỊCH VỤ', ['NƠI LẤY', 'NƠI ĐÓNG/RÚT HÀNG', 'NƠI HẠ']);
  group(C_FEE0, C_VAT, 'CƯỚC DỊCH VỤ', [...SERVICE_COLUMNS.map((s) => s.header), vatHeader]);
  leaf(C_TOTAL, 'TỔNG CỘNG');
  leaf(C_CONTRACT, 'HĐ VẬN CHUYỂN');
  group(
    C_CHI_HO0,
    C_KHACH_AMOUNT - 1,
    'CHI HỘ (HD DU)',
    Array.from({ length: groups }, () => [...CHI_HO_GROUP_HEADERS]).flat(),
  );
  group(C_KHACH_AMOUNT, C_KHACH_INVOICE, 'CHI HỘ (HD KHACH)', ['PHÍ NÂNG', 'SỐ HĐ']);
  leaf(C_NOTE, 'GHI CHÚ');

  const sums = new Map<number, number>();
  const addSum = (c: number, amount: number) => sums.set(c, (sums.get(c) ?? 0) + amount);
  const sizeCounts = SIZE_BUCKETS.map(() => 0);

  const rFirstData = aoa.length;
  rows.forEach((o, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    const putMoney = (c: number, amount: number) => {
      if (amount !== 0) row[c] = amount;
      addSum(c, amount);
    };

    row[C_STT] = i + 1;
    row[C_DATE] = formatDate(orderPlanDate(o));
    row[C_TRUCK] = joinedPlates(o, truckLabel);
    row[C_BL] = o.billNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';
    const size = sizeBucketIndex(readTruckingSize(o));
    if (size >= 0) {
      row[C_SIZE0 + size] = 1;
      sizeCounts[size] += 1;
    }
    row[C_TYPE] = o.shipmentType ? resolveShipmentType(o.shipmentType).toLocaleUpperCase('vi') : '';
    row[C_PICKUP] = o.route?.pickup ?? '';
    row[C_STUFFING] = o.route?.stuffing ?? '';
    row[C_DROPOFF] = o.route?.dropoff ?? '';

    const feeSums = new Map<number, number>();
    for (const fee of readFeeLines(o)) {
      if (fee.kind !== 'service') continue;
      const c = C_FEE0 + SERVICE_COLUMNS.findIndex((s) => s.column === columnOf(fee.label));
      feeSums.set(c, (feeSums.get(c) ?? 0) + (fee.amount || 0));
    }
    for (const [c, amount] of feeSums) putMoney(c, amount);

    const { serviceSubtotal, vatAmount } = orderTotals(o);
    putMoney(C_VAT, vatAmount);
    putMoney(C_TOTAL, serviceSubtotal + vatAmount);
    row[C_CONTRACT] = o.transportContractNo ?? '';

    chiHoLines(o).forEach((fee, g) => {
      const gross = fee.amount || 0;
      const { before, vat } = splitChiHoVat(gross);
      putMoney(groupCol(g, 0), before);
      putMoney(groupCol(g, 1), vat);
      putMoney(groupCol(g, 2), gross);
      row[groupCol(g, 3)] = fee.invoiceNo ?? '';
      row[groupCol(g, 4)] = fee.label;
    });

    row[C_NOTE] = o.notes ?? '';
    aoa.push(row);
  });
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
  const C_FOOTER_LABEL = C_FEE0 + SERVICE_COLUMNS.length - 1;
  const service = sums.get(C_TOTAL) ?? 0;
  const chiHo = Array.from({ length: groups }, (_, g) => sums.get(groupCol(g, 2)) ?? 0).reduce(
    (a, b) => a + b,
    0,
  );
  const footer = [
    { label: 'Số tiền cước vận chuyển:', value: service, note: '(Đã bao gồm VAT)' },
    { label: 'Số tiền chi hộ:', value: chiHo, note: '(Đã bao gồm VAT)' },
    { label: 'Tổng số tiền cần thanh toán:', value: service + chiHo, note: '' },
  ];
  const rFooter = aoa.length;
  for (const line of footer) {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_FOOTER_LABEL] = line.label;
    row[C_TOTAL] = line.value;
    row[C_CONTRACT] = line.note;
    merges.push({ s: { r, c: C_FOOTER_LABEL }, e: { r, c: C_VAT } });
    aoa.push(row);
  }

  const signature = sheet.signatureRow(customer.name, seller.name);

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
    if (c === C_CONTRACT) return { wch: 16 };
    if (c >= C_CHI_HO0 && c < C_KHACH_AMOUNT) {
      const slot = (c - C_CHI_HO0) % CHI_HO_GROUP_WIDTH;
      if (slot === 3) return { wch: 10 };
      if (slot === 4) return { wch: 14 };
    }
    if (c === C_KHACH_INVOICE) return { wch: 10 };
    if (c === C_NOTE) return { wch: 26 };
    return { wch: 14 };
  });

  const { setStyle, setFmt, styleLetterhead, styleHeaderBand, styleTotalRow, styleSignature } =
    makeStyler(ws);
  const isMoneyCol = (c: number) => moneyCols.includes(c);

  styleLetterhead({ rSeller, rTitle, rDear });
  setStyle(rInvoiceRef, 0, { alignment: { horizontal: 'center' } });
  styleHeaderBand([rHead1, rHead2], lastCol, (c) =>
    MANUAL_COLS.includes(c) ? MANUAL_FILL : HEADER_FILL,
  );

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'top', wrapText: true } });
      if (MANUAL_COLS.includes(c)) setStyle(r, c, { fill: MANUAL_FILL });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    for (const c of [C_STT, C_DATE, C_TYPE, C_SIZE0, C_SIZE0 + 1]) {
      setStyle(r, c, { alignment: { horizontal: 'center' } });
    }
  }

  styleTotalRow(rTotalRow, lastCol, isMoneyCol);

  const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  if (rows.length > 0) {
    (ws[ref(rTotalRow, C_KHACH_AMOUNT)] as StyledCell).f =
      `SUM(${ref(rFirstData, C_KHACH_AMOUNT)}:${ref(rLastData, C_KHACH_AMOUNT)})`;
  }
  const formulas = [
    ref(rTotalRow, C_TOTAL),
    [
      ...Array.from({ length: groups }, (_, g) => ref(rTotalRow, groupCol(g, 2))),
      ref(rTotalRow, C_KHACH_AMOUNT),
    ].join('+'),
    `${ref(rFooter, C_TOTAL)}+${ref(rFooter + 1, C_TOTAL)}`,
  ];
  formulas.forEach((formula, i) => {
    const r = rFooter + i;
    (ws[ref(r, C_TOTAL)] as StyledCell).f = formula;
    setStyle(r, C_FOOTER_LABEL, { font: { bold: true }, alignment: { horizontal: 'right' } });
    setStyle(r, C_TOTAL, { font: { bold: true } });
    setFmt(r, C_TOTAL, FMT_MONEY);
    setStyle(r, C_CONTRACT, { font: { italic: true } });
  });

  styleSignature(signature);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
};
