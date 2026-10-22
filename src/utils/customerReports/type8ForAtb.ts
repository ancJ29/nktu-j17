import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
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

const SIZE_BUCKETS = ['20', '40'] as const;
const SIZE_MARK = 'X';

const FREIGHT_FEE = 'PHI_VAN_CHUYEN';
const LIFT_FEE = 'PHI_NANG';
const DROP_FEE = 'PHI_HA';

function feeMatcher(
  resolveFeeName: (value: string) => string,
  value: string,
): (label: string) => boolean {
  const keys = new Set([feeKey(value), feeKey(resolveFeeName(value))]);
  return (label) => keys.has(feeKey(label)) || keys.has(feeKey(resolveFeeName(label)));
}

export const buildCustomerReportType8: CustomerReportBuilder = (
  orders,
  {
    seller,
    customer,

    resolveFeeName,
    getTruckPlate,
    titleSuffix,
  },
) => {
  const rows = statementRows(orders);
  const truckLabel = truckLabeler(getTruckPlate);
  const isFreight = feeMatcher(resolveFeeName, FREIGHT_FEE);
  const isLift = feeMatcher(resolveFeeName, LIFT_FEE);
  const isDrop = feeMatcher(resolveFeeName, DROP_FEE);

  const readMoney = (o: TransportOrder) => {
    let freight = 0;
    let other = 0;
    let lift = 0;
    let drop = 0;
    const liftInvoices: string[] = [];
    const dropInvoices: string[] = [];
    for (const fee of readFeeLines(o)) {
      if (!isBillableFee(fee)) continue;
      const amount = fee.amount || 0;
      if (fee.kind === 'service') {
        if (isFreight(fee.label)) freight += amount;
        else other += amount;
      } else if (isLift(fee.label)) {
        lift += amount;
        if (fee.invoiceNo) liftInvoices.push(fee.invoiceNo);
      } else if (isDrop(fee.label)) {
        drop += amount;
        if (fee.invoiceNo) dropInvoices.push(fee.invoiceNo);
      }
    }
    const { serviceSubtotal, vatAmount } = orderTotals(o);
    const freightTotal = serviceSubtotal + vatAmount;
    return {
      freight,
      other,
      vat: vatAmount,
      freightTotal,
      lift,
      drop,
      liftInvoice: liftInvoices.join(', '),
      dropInvoice: dropInvoices.join(', '),
      grand: lift + drop + freightTotal,
    };
  };

  const rates = new Set(rows.map((o) => o.vatRate ?? 0));
  const uniformRate = rates.size === 1 ? [...rates][0]! : undefined;
  const vatHeader =
    uniformRate && uniformRate > 0
      ? `Thuế VAT ${Number((uniformRate * 100).toFixed(2))}%`
      : 'Thuế VAT';

  const C_STT = 0;
  const C_BOOKING = 1;
  const C_CONT = 2;
  const C_TRUCK = 3;
  const C_SIZE0 = 4;
  const C_LIFT_PORT = C_SIZE0 + SIZE_BUCKETS.length;
  const C_LIFT_INVOICE = C_LIFT_PORT + 1;
  const C_LIFT_DATE = C_LIFT_INVOICE + 1;
  const C_LIFT = C_LIFT_DATE + 1;
  const C_DROP_PORT = C_LIFT + 1;
  const C_DROP_INVOICE = C_DROP_PORT + 1;
  const C_DROP_DATE = C_DROP_INVOICE + 1;
  const C_DROP = C_DROP_DATE + 1;
  const C_LIFT_DROP = C_DROP + 1;
  const C_FREIGHT = C_LIFT_DROP + 1;
  const C_OTHER = C_FREIGHT + 1;
  const C_VAT = C_OTHER + 1;
  const C_FREIGHT_TOTAL = C_VAT + 1;
  const C_CONTRACT = C_FREIGHT_TOTAL + 1;
  const C_CONTRACT_DATE = C_CONTRACT + 1;
  const C_GRAND = C_CONTRACT_DATE + 1;
  const colCount = C_GRAND + 1;
  const lastCol = colCount - 1;

  const MANUAL_COLS = [C_LIFT_DATE, C_DROP_DATE, C_CONTRACT_DATE];
  const moneyCols = [
    C_LIFT,
    C_DROP,
    C_LIFT_DROP,
    C_FREIGHT,
    C_OTHER,
    C_VAT,
    C_FREIGHT_TOTAL,
    C_GRAND,
  ];

  const sheet = createSheetWriter(colCount);
  const { aoa, merges, blankRow } = sheet;

  const letterheadRows = sheet.letterhead(
    seller,
    customer,
    bangKeTitle(titleSuffix, bangKePeriodLabel(rows)),
  );

  const { rHead1, rHead2, leaf } = sheet.headerBand();
  leaf(C_STT, 'STT');
  leaf(C_BOOKING, 'Số Booking');
  leaf(C_CONT, 'Số Cont');
  leaf(C_TRUCK, 'Số Xe');
  SIZE_BUCKETS.forEach((label, k) => leaf(C_SIZE0 + k, label));
  leaf(C_LIFT_PORT, 'Cảng nâng');
  leaf(C_LIFT_INVOICE, 'Số HĐ nâng');
  leaf(C_LIFT_DATE, 'Ngày HĐ nâng');
  leaf(C_LIFT, 'Số tiền nâng');
  leaf(C_DROP_PORT, 'Cảng hạ');
  leaf(C_DROP_INVOICE, 'Số HĐ hạ');
  leaf(C_DROP_DATE, 'Ngày HĐ hạ');
  leaf(C_DROP, 'Số tiền hạ');
  leaf(C_LIFT_DROP, 'Tổng cộng tiền nâng hạ');
  leaf(C_FREIGHT, 'Cước vận chuyển (chưa VAT)');
  leaf(C_OTHER, 'Phí khác');
  leaf(C_VAT, vatHeader);
  leaf(C_FREIGHT_TOTAL, 'Tổng cộng tiền VC (gồm VAT)');
  leaf(C_CONTRACT, 'Số HĐ vận chuyển');
  leaf(C_CONTRACT_DATE, 'Ngày HĐ vận chuyển');
  leaf(C_GRAND, 'Tổng');

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
    row[C_BOOKING] = o.billNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';
    row[C_TRUCK] = joinedPlates(o, truckLabel);
    const size = sizeBucketIndex(readTruckingSize(o));
    if (size >= 0) {
      row[C_SIZE0 + size] = SIZE_MARK;
      sizeCounts[size] += 1;
    }

    row[C_LIFT_PORT] = o.route?.pickup ?? '';
    row[C_DROP_PORT] = o.route?.dropoff ?? '';

    const money = readMoney(o);
    row[C_LIFT_INVOICE] = money.liftInvoice;
    row[C_DROP_INVOICE] = money.dropInvoice;
    putMoney(C_LIFT, money.lift);
    putMoney(C_DROP, money.drop);
    putMoney(C_LIFT_DROP, money.lift + money.drop);
    putMoney(C_FREIGHT, money.freight);
    putMoney(C_OTHER, money.other);
    putMoney(C_VAT, money.vat);
    putMoney(C_FREIGHT_TOTAL, money.freightTotal);
    row[C_CONTRACT] = o.transportContractNo ?? '';
    putMoney(C_GRAND, money.grand);

    aoa.push(row);
  });
  const rLastData = aoa.length - 1;

  const rTotalRow = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_BOOKING] = 'TỔNG CỘNG';
    SIZE_BUCKETS.forEach((_b, k) => {
      row[C_SIZE0 + k] = sizeCounts[k]!;
    });
    for (const c of moneyCols) row[c] = sums.get(c) ?? 0;
    aoa.push(row);
  }

  blankRow();
  const freightTotal = sums.get(C_FREIGHT_TOTAL) ?? 0;
  const chiHo = (sums.get(C_LIFT) ?? 0) + (sums.get(C_DROP) ?? 0);
  const footer = [
    { label: 'Số tiền cước vận chuyển:', value: freightTotal, note: '(Đã bao gồm VAT)' },
    { label: 'Số tiền chi hộ:', value: chiHo, note: '(Đã bao gồm VAT)' },
    { label: 'Tổng số tiền cần thanh toán:', value: freightTotal + chiHo, note: '' },
  ];
  const rFooter = aoa.length;
  for (const line of footer) {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_DROP_DATE] = line.label;
    row[C_LIFT_DROP] = line.value;
    row[C_FREIGHT] = line.note;
    merges.push({ s: { r, c: C_DROP_DATE }, e: { r, c: C_DROP } });
    aoa.push(row);
  }

  const signature = sheet.signatureRow(customer.name, seller.name);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
    if (c === C_STT) return { wch: 5 };
    if (c === C_BOOKING || c === C_CONT) return { wch: 17 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c >= C_SIZE0 && c < C_LIFT_PORT) return { wch: 5 };
    if (c === C_LIFT_PORT || c === C_DROP_PORT) return { wch: 24 };
    if (MANUAL_COLS.includes(c)) return { wch: 11 };
    if (c === C_LIFT_INVOICE || c === C_DROP_INVOICE || c === C_CONTRACT) return { wch: 12 };
    return { wch: 15 };
  });

  const { setStyle, setFmt, styleLetterhead, styleHeaderBand, styleTotalRow, styleSignature } =
    makeStyler(ws);
  const isMoneyCol = (c: number) => moneyCols.includes(c);

  styleLetterhead(letterheadRows);
  styleHeaderBand([rHead1, rHead2], lastCol, (c) =>
    MANUAL_COLS.includes(c) ? MANUAL_FILL : HEADER_FILL,
  );

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'center', wrapText: true } });
      if (MANUAL_COLS.includes(c)) setStyle(r, c, { fill: MANUAL_FILL });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    for (const c of [C_STT, C_SIZE0, C_SIZE0 + 1]) {
      setStyle(r, c, { alignment: { horizontal: 'center' } });
    }
  }

  styleTotalRow(rTotalRow, lastCol, isMoneyCol);

  const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const formulas = [
    ref(rTotalRow, C_FREIGHT_TOTAL),
    `${ref(rTotalRow, C_LIFT)}+${ref(rTotalRow, C_DROP)}`,
    `${ref(rFooter, C_LIFT_DROP)}+${ref(rFooter + 1, C_LIFT_DROP)}`,
  ];
  formulas.forEach((formula, i) => {
    const r = rFooter + i;
    (ws[ref(r, C_LIFT_DROP)] as StyledCell).f = formula;
    setStyle(r, C_DROP_DATE, { font: { bold: true }, alignment: { horizontal: 'right' } });
    setStyle(r, C_LIFT_DROP, { font: { bold: true } });
    setFmt(r, C_LIFT_DROP, FMT_MONEY);
    setStyle(r, C_FREIGHT, { font: { italic: true } });
  });

  styleSignature(signature);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
};
