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
  bangKeTitle,
  createSheetWriter,
  joinedPlates,
  makeStyler,
  sizeBucketIndex,
  statementRows,
  truckLabeler,
  type CellValue,
} from './sheetKit';

const SIZE_BUCKETS = ["20'", "40'"] as const;

type Type7FeeColumn = 'freight' | 'offRoute' | 'demurrage';

const SERVICE_COLUMNS: ReadonlyArray<{ column: Type7FeeColumn; header: string }> = [
  { column: 'freight', header: 'PHÍ VẬN CHUYỂN' },
  { column: 'offRoute', header: 'PHÍ TRÁI TUYẾN' },
  { column: 'demurrage', header: 'PHÍ NEO XE' },
];

const FEE_NAMES: Record<Exclude<Type7FeeColumn, 'freight'>, ReadonlyArray<string>> = {
  offRoute: ['PHI_TRAI_TUYEN'],
  demurrage: ['PHI_NEO_XE'],
};

function serviceColumnReader(
  resolveFeeName: (value: string) => string,
): (label: string) => Type7FeeColumn {
  const byKey = new Map<string, Type7FeeColumn>();
  for (const [column, values] of Object.entries(FEE_NAMES) as Array<
    [Type7FeeColumn, ReadonlyArray<string>]
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

const CUSTOMER_PAID = 'KHACH TT';

const CHI_HO_TOTAL_FILL = { fgColor: { rgb: 'FFC000' } } as const;

export const buildCustomerReportType7: CustomerReportBuilder = (
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
      .filter((f) => f.kind === 'passthrough' && (f.amount || 0) !== 0)
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
  const C_NOTE = C_TOTAL + 1;
  const C_CHI_HO0 = C_NOTE + 1;
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
  const rAddress = banner(`Địa chỉ: ${seller.address}`);
  banner(`Mã số thuế: ${seller.taxCode}`);
  banner('Số:……………..');
  blankRow();
  const rTitle = banner(bangKeTitle(titleSuffix, '').trim());
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
  leaf(C_NOTE, 'Ghi chú');

  group(
    C_CHI_HO0,
    lastCol,
    '',
    Array.from({ length: groups }, () => [...CHI_HO_GROUP_HEADERS]).flat(),
  );

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
    row[C_NOTE] = o.notes ?? '';

    chiHoLines(o).forEach((fee, g) => {
      if (isBillableFee(fee)) putMoney(groupCol(g, 0), fee.amount || 0);
      else row[groupCol(g, 0)] = CUSTOMER_PAID;
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

  const signature = sheet.signatureRow(
    `Xác nhận của ${customer.name}`,
    `Xác nhận của ${seller.name}`,
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
    if (c === C_STT) return { wch: 5 };
    if (c === C_DATE) return { wch: 11 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c === C_BL || c === C_CONT) return { wch: 17 };
    if (c >= C_SIZE0 && c < C_TYPE) return { wch: 6 };
    if (c === C_TYPE) return { wch: 10 };
    if (c >= C_PICKUP && c <= C_DROPOFF) return { wch: 24 };
    if (c === C_NOTE) return { wch: 14 };
    if (c >= C_CHI_HO0 && (c - C_CHI_HO0) % CHI_HO_GROUP_WIDTH !== 0) return { wch: 10 };
    return { wch: 13 };
  });

  const { setStyle, setFmt, styleHeaderBand, styleTotalRow, styleSignature } = makeStyler(ws);
  const isMoneyCol = (c: number) => moneyCols.includes(c);

  setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
  setStyle(rAddress, 0, { font: { bold: true } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  styleHeaderBand([rHead1, rHead2], lastCol);

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'center', wrapText: true } });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    for (const c of [C_STT, C_DATE, C_TYPE, C_SIZE0, C_SIZE0 + 1]) {
      setStyle(r, c, { alignment: { horizontal: 'center' } });
    }
  }

  styleTotalRow(rTotalRow, lastCol, isMoneyCol);
  for (const c of chiHoAmountCols) setStyle(rTotalRow, c, { fill: CHI_HO_TOTAL_FILL });
  styleSignature(signature);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
};
