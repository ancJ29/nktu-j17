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

type Type9FeeColumn = 'freight' | 'toll' | 'storage';

const SERVICE_COLUMNS: ReadonlyArray<{ column: Type9FeeColumn; header: string }> = [
  { column: 'freight', header: 'PHÍ VẬN CHUYỂN' },
  { column: 'toll', header: 'VÉ TRẠM' },
  { column: 'storage', header: 'PHÍ GỬI' },
];

const FEE_NAMES: Record<Exclude<Type9FeeColumn, 'freight'>, ReadonlyArray<string>> = {
  toll: ['PHI_TRAM', 'VE_TRAM_PHU_HUU', 'VE_TRAM_XLHN'],
  storage: ['PHI_GUI'],
};

function serviceColumnReader(
  resolveFeeName: (value: string) => string,
): (label: string) => Type9FeeColumn {
  const byKey = new Map<string, Type9FeeColumn>();
  for (const [column, values] of Object.entries(FEE_NAMES) as Array<
    [Type9FeeColumn, ReadonlyArray<string>]
  >) {
    for (const value of values) {
      byKey.set(feeKey(value), column);
      byKey.set(feeKey(resolveFeeName(value)), column);
    }
  }
  return (label) =>
    byKey.get(feeKey(label)) ?? byKey.get(feeKey(resolveFeeName(label))) ?? 'freight';
}

const CHI_HO_GROUP_HEADERS = ['PHÍ CHI', 'SỐ HĐ', 'TÊN PHÍ'] as const;
const CHI_HO_GROUP_WIDTH = CHI_HO_GROUP_HEADERS.length;

const MIN_CHI_HO_GROUPS = 2;

const paymentNotes = (
  sellerName: string,
): ReadonlyArray<{ text: string; value?: string } | null> => [
  {
    text: 'Vui lòng thanh toán cho công ty chúng tôi PHÍ VẬN CHUYỂN  trên bằng chuyển khoản theo thông tin:',
  },
  { text: `Công ty thụ hưởng: ${sellerName}` },
  {
    text: 'Số tài khoản:',
    value: '102 796 7777  Tại ngân hàng Vietcombank, Chi nhánh Hồ Chí Minh',
  },
  null,
  {
    text: 'Vui lòng thanh toán PHÍ CHI HỘ cho chúng tôi số tiền nêu trên bằng chuyển khoản theo thông tin:',
  },
  { text: 'Người thụ hưởng:', value: 'VÕ VĂN HÀO' },
  {
    text: 'Số tài khoản:',
    value: '19038044220014 Tại Ngân hàng kỹ thương Việt Nam ( Techcombank)',
  },
];

export const buildCustomerReportType9: CustomerReportBuilder = (
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

  const groups = Math.max(MIN_CHI_HO_GROUPS, ...rows.map((o) => chiHoLines(o).length));

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
  const colCount = C_CHI_HO0 + groups * CHI_HO_GROUP_WIDTH;
  const lastCol = colCount - 1;

  const groupCol = (g: number, slot: number) => C_CHI_HO0 + g * CHI_HO_GROUP_WIDTH + slot;
  const chiHoAmountCols = Array.from({ length: groups }, (_, g) => groupCol(g, 0));
  const moneyCols = [
    ...SERVICE_COLUMNS.map((_s, i) => C_FEE0 + i),
    C_VAT,
    C_TOTAL,
    ...chiHoAmountCols,
  ];

  const sheet = createSheetWriter(colCount);
  const { aoa, merges, blankRow, banner } = sheet;

  const rSeller = banner(seller.name);
  banner(seller.address);
  banner(`MST: ${seller.taxCode}`);
  const rTitle = banner(bangKeTitle(titleSuffix, bangKePeriodLabel(rows)));
  const rInvoiceRef = banner('Kèm theo hóa đơn số …... Ngày …..');
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
    lastCol,
    'DŨNG UY',
    Array.from({ length: groups }, () => [...CHI_HO_GROUP_HEADERS]).flat(),
  );

  const sums = new Map<number, number>();
  const sizeCounts = SIZE_BUCKETS.map(() => 0);

  const rFirstData = aoa.length;
  rows.forEach((o, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    const putMoney = (c: number, amount: number) => {
      if (amount !== 0) row[c] = amount;
      sums.set(c, (sums.get(c) ?? 0) + amount);
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
      putMoney(groupCol(g, 0), fee.amount || 0);
      row[groupCol(g, 1)] = fee.invoiceNo ?? '';
      row[groupCol(g, 2)] = fee.label;
    });

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
    merges.push({ s: { r: rTotalRow, c: C_STT }, e: { r: rTotalRow, c: C_CONT } });
  }

  blankRow();
  const C_SUMMARY_LABEL = C_VAT - 1;
  const C_NOTE_VALUE = C_TRUCK;
  const C_NOTE_END = C_SUMMARY_LABEL - 1;
  const service = sums.get(C_TOTAL) ?? 0;
  const chiHo = chiHoAmountCols.reduce((sum, c) => sum + (sums.get(c) ?? 0), 0);
  const summary = [
    { label: 'Số tiền cước vận chuyển:', value: service, note: '(đã bao gồm VAT)' },
    { label: 'Số tiền chi hộ:', value: chiHo, note: '(đã bao gồm VAT)' },
    { label: 'Tổng số tiền cần thanh toán:', value: service + chiHo, note: '' },
  ];
  const notes = paymentNotes(seller.name);
  const rFooter = aoa.length;
  const introRows: number[] = [];
  for (let i = 0; i < Math.max(notes.length, summary.length); i++) {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    const note = notes[i];
    if (note && note.value === undefined) {
      row[C_DATE] = note.text;
      merges.push({ s: { r, c: C_DATE }, e: { r, c: C_NOTE_END } });
      if (note.text.startsWith('Vui lòng')) introRows.push(r);
    } else if (note) {
      row[C_DATE] = note.text;
      row[C_NOTE_VALUE] = note.value!;
      merges.push({ s: { r, c: C_NOTE_VALUE }, e: { r, c: C_NOTE_END } });
    }
    const line = summary[i];
    if (line) {
      row[C_SUMMARY_LABEL] = line.label;
      row[C_TOTAL] = line.value;
      row[C_CONTRACT] = line.note;
      merges.push({ s: { r, c: C_SUMMARY_LABEL }, e: { r, c: C_VAT } });
    }
    aoa.push(row);
  }

  const signature = sheet.signatureRow(customer.name, seller.name);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
    if (c === C_STT) return { wch: 5 };
    if (c === C_DATE) return { wch: 16 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c === C_BL || c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_TYPE) return { wch: 6 };
    if (c === C_TYPE) return { wch: 10 };
    if (c >= C_PICKUP && c <= C_DROPOFF) return { wch: 24 };
    if (c === C_CONTRACT) return { wch: 16 };
    if (c >= C_CHI_HO0 && (c - C_CHI_HO0) % CHI_HO_GROUP_WIDTH !== 0) return { wch: 11 };
    return { wch: 14 };
  });

  const { setStyle, setFmt, styleLetterhead, styleHeaderBand, styleTotalRow, styleSignature } =
    makeStyler(ws);
  const isMoneyCol = (c: number) => moneyCols.includes(c);

  styleLetterhead({ rSeller, rTitle, rDear });
  setStyle(rInvoiceRef, 0, { alignment: { horizontal: 'center' } });
  styleHeaderBand([rHead1, rHead2], lastCol);

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'top', wrapText: true } });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    for (const c of [C_STT, C_DATE, C_TYPE, C_SIZE0, C_SIZE0 + 1]) {
      setStyle(r, c, { alignment: { horizontal: 'center' } });
    }
  }

  styleTotalRow(rTotalRow, lastCol, isMoneyCol);

  for (const r of introRows) setStyle(r, C_DATE, { font: { bold: true, italic: true } });

  const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const formulas = [
    ref(rTotalRow, C_TOTAL),
    chiHoAmountCols.map((c) => ref(rTotalRow, c)).join('+'),
    `${ref(rFooter, C_TOTAL)}+${ref(rFooter + 1, C_TOTAL)}`,
  ];
  formulas.forEach((formula, i) => {
    const r = rFooter + i;
    (ws[ref(r, C_TOTAL)] as StyledCell).f = formula;
    setStyle(r, C_SUMMARY_LABEL, { font: { bold: true }, alignment: { horizontal: 'right' } });
    setStyle(r, C_TOTAL, { font: { bold: true } });
    setFmt(r, C_TOTAL, FMT_MONEY);
    setStyle(r, C_CONTRACT, { font: { italic: true } });
  });

  styleSignature(signature);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
};
