import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import type { CustomerReportBuilder, CustomerReportInput } from './types';
import { readTruckingSize } from '@/pages/transport-orders/truckingSize';
import {
  ALL_BORDERS,
  FMT_MONEY,
  FMT_MONEY_DASH,
  HEADER_FILL,
  MANUAL_FILL,
  TOTAL_FILL,
  bangKePeriodLabel,
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

const FREIGHT_FEE_VALUE = 'PHI_VAN_CHUYEN';

const SURCHARGE_FEE_VALUE = 'LO_XE';

type Type4Bucket = 'freight' | 'surcharge' | 'other';

const feeBucketReader = (resolveFeeName: (value: string) => string) => {
  const freightKey = feeKey(resolveFeeName(FREIGHT_FEE_VALUE));
  const surchargeKey = feeKey(resolveFeeName(SURCHARGE_FEE_VALUE));
  return (label: string): Type4Bucket => {
    const key = feeKey(resolveFeeName(label));
    if (key === freightKey) return 'freight';
    if (key === surchargeKey) return 'surcharge';
    return 'other';
  };
};

function batchYear(orders: ReadonlyArray<TransportOrder>): number {
  let latest = Number.NEGATIVE_INFINITY;
  for (const o of orders) {
    const t = new Date(orderPlanDate(o) as string | number | Date).getTime();
    if (!Number.isNaN(t)) latest = Math.max(latest, t);
  }
  return Number.isFinite(latest) ? new Date(latest).getFullYear() : new Date().getFullYear();
}

const buildChiHoSummarySheet = (
  rows: ReadonlyArray<TransportOrder>,
  {
    seller,
    customer,
    resolveFeeName,
  }: Pick<CustomerReportInput, 'seller' | 'customer' | 'resolveFeeName'>,

  bucketOf: (label: string) => Type4Bucket,
): { ws: XLSX.WorkSheet; rowCount: number } => {
  const entries = rows
    .map((order) => {
      const fees = readFeeLines(order).filter(
        (f) =>
          bucketOf(f.label) === 'other' &&
          isBillableFee(f) &&
          ((f as TransportOrderFee).amount || 0) !== 0,
      );
      return {
        order,
        amount: fees.reduce((sum, f) => sum + ((f as TransportOrderFee).amount || 0), 0),
        labels: fees.map((f) => resolveFeeName(f.label)).join(', '),
        count: fees.length,
      };
    })
    .filter((e) => e.count > 0);

  const D_STT = 0;
  const D_DECL = 1;
  const D_SUPPLIER = 2;
  const D_QTY = 3;
  const D_PRICE = 4;
  const D_DESC = 5;
  const D_GOODS = 6;
  const D_DATE = 7;
  const colCount = D_DATE + 1;
  const lastCol = colCount - 1;

  const MANUAL_COLS = [D_SUPPLIER, D_GOODS, D_DATE];

  const { aoa, merges, blankRow, banner } = createSheetWriter(colCount);

  const rSeller = banner(seller.name);
  banner(seller.address);
  banner(`MST: ${seller.taxCode}`);
  const rDivider = banner('----------------o0o----------------');
  const rTitle = banner('TỔNG HỢP CHI PHÍ CHI HỘ');

  const rNumber = banner(`Số:  - VH/${batchYear(rows)}`);
  blankRow();
  const rDear = banner(`Kính gửi: ${customer.name}`);
  blankRow();

  const rHead = aoa.length;
  const head: CellValue[] = new Array(colCount).fill('');
  head[D_STT] = 'Số TT';
  head[D_DECL] = 'Số tờ khai';
  head[D_SUPPLIER] = 'Tên hàng/ Nhà cung cấp';

  head[D_QTY] = "Số lượng (Cont 20')";
  head[D_PRICE] = 'Đơn giá (VND)';
  head[D_DESC] = 'Diễn giải';
  head[D_GOODS] = 'Tên hàng';

  aoa.push(head);

  let total = 0;
  const rFirstData = aoa.length;
  entries.forEach(({ order, amount, labels }, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    row[D_STT] = i + 1;
    row[D_DECL] = order.declarationNumber ?? '';

    row[D_QTY] = 1;
    row[D_PRICE] = amount;
    row[D_DESC] = labels;
    aoa.push(row);
    total += amount;
  });
  const rLastData = aoa.length - 1;

  const rSubtotal = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[D_STT] = 'Tổng Chi Hộ';
    row[D_PRICE] = total;
    aoa.push(row);
  }
  const rGrand = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[D_STT] = 'TỔNG CỘNG';
    row[D_PRICE] = total;
    aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 7 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 15 },
    { wch: 16 },
    { wch: 40 },
    { wch: 10 },
  ];

  const { setStyle, setFmt, styleLetterhead, styleHeaderBand } = makeStyler(ws);

  styleLetterhead({ rSeller, rTitle, rDear });
  setStyle(rDivider, 0, { alignment: { horizontal: 'center' } });
  setStyle(rNumber, 0, { alignment: { horizontal: 'center' } });

  styleHeaderBand([rHead], lastCol, (c) => (MANUAL_COLS.includes(c) ? MANUAL_FILL : HEADER_FILL));

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'center' } });
      if (MANUAL_COLS.includes(c)) setStyle(r, c, { fill: MANUAL_FILL });
    }
    setStyle(r, D_STT, { alignment: { horizontal: 'center' } });
    setStyle(r, D_QTY, { alignment: { horizontal: 'center' } });
    setFmt(r, D_PRICE, FMT_MONEY);
  }

  for (const r of [rSubtotal, rGrand]) {
    setStyle(r, D_STT, { font: { bold: true } });
    setStyle(r, D_PRICE, { font: { bold: true }, fill: TOTAL_FILL });
    setFmt(r, D_PRICE, FMT_MONEY_DASH);
  }

  return { ws, rowCount: entries.length };
};

export const buildCustomerReportType4: CustomerReportBuilder = (
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

  const bucketOf = feeBucketReader(resolveFeeName);

  const splitMoney = (o: TransportOrder) => {
    let freight = 0;
    let surcharge = 0;
    for (const f of readFeeLines(o)) {
      if (!isBillableFee(f)) continue;
      const amount = (f as TransportOrderFee).amount || 0;
      const bucket = bucketOf(f.label);
      if (bucket === 'freight') freight += amount;
      else if (bucket === 'surcharge') surcharge += amount;
    }
    return { freight, surcharge, total: freight + surcharge };
  };

  const C_STT = 0;
  const C_DATE = 1;
  const C_TRUCK = 2;
  const C_FROM = 3;
  const C_TO = 4;
  const C_DROP = 5;
  const C_DECL = 6;
  const C_CONT = 7;
  const C_SIZE0 = 8;
  const C_FREIGHT = C_SIZE0 + SIZE_BUCKETS.length;
  const C_SURCHARGE = C_FREIGHT + 1;
  const C_TOTAL = C_SURCHARGE + 1;
  const colCount = C_TOTAL + 1;
  const lastCol = colCount - 1;

  const sheet = createSheetWriter(colCount);
  const { aoa, merges } = sheet;

  const letterheadRows = sheet.letterhead(
    seller,
    customer,
    bangKeTitle(titleSuffix, bangKePeriodLabel(rows)),
  );

  const { rHead1, rHead2, leaf, group } = sheet.headerBand();

  leaf(C_STT, 'STT');
  leaf(C_DATE, 'NGÀY');
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_FROM, 'NƠI ĐI');
  leaf(C_TO, 'NƠI ĐẾN');
  leaf(C_DROP, 'NƠI HẠ');
  leaf(C_DECL, 'SỐ TỜ KHAI');
  leaf(C_CONT, 'SỐ CONT');
  group(C_SIZE0, C_SIZE0 + SIZE_BUCKETS.length - 1, 'LOẠI', [...SIZE_BUCKETS]);
  leaf(C_FREIGHT, 'CƯỚC CHƯA VAT');
  leaf(C_SURCHARGE, 'PHỤ PHÍ');
  leaf(C_TOTAL, 'TỔNG THÀNH TIỀN');

  const truckLabel = truckLabeler(getTruckPlate);

  let sumFreight = 0;
  let sumSurcharge = 0;
  const sizeCounts = SIZE_BUCKETS.map(() => 0);
  const rFirstData = aoa.length;
  rows.forEach((o, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_STT] = i + 1;
    row[C_DATE] = formatDate(orderPlanDate(o));
    row[C_TRUCK] = joinedPlates(o, truckLabel);

    row[C_FROM] = o.route?.pickup ?? '';
    row[C_TO] = o.route?.stuffing ?? '';
    row[C_DROP] = o.route?.dropoff ?? '';

    row[C_DECL] = o.declarationNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';
    const s = sizeBucketIndex(readTruckingSize(o));
    if (s >= 0) {
      row[C_SIZE0 + s] = 1;
      sizeCounts[s] += 1;
    }

    const { freight, surcharge, total } = splitMoney(o);
    if (freight !== 0) row[C_FREIGHT] = freight;
    if (surcharge !== 0) row[C_SURCHARGE] = surcharge;
    if (total !== 0) row[C_TOTAL] = total;
    sumFreight += freight;
    sumSurcharge += surcharge;

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
    row[C_FREIGHT] = sumFreight;
    row[C_SURCHARGE] = sumSurcharge;
    row[C_TOTAL] = sumFreight + sumSurcharge;
    aoa.push(row);
  }

  const signature = sheet.signatureRow(customer.name, seller.name);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: colCount }, (_, c) => {
    if (c === C_STT) return { wch: 5 };
    if (c === C_DATE) return { wch: 11 };
    if (c === C_TRUCK) return { wch: 13 };
    if (c >= C_FROM && c <= C_DROP) return { wch: 22 };
    if (c === C_DECL || c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_FREIGHT) return { wch: 6 };
    if (c === C_TOTAL) return { wch: 18 };
    return { wch: 15 };
  });

  const { setStyle, setFmt, styleLetterhead, styleHeaderBand, styleTotalRow, styleSignature } =
    makeStyler(ws);
  const isMoneyCol = (c: number) => c >= C_FREIGHT && c <= C_TOTAL;

  styleLetterhead(letterheadRows);
  styleHeaderBand([rHead1, rHead2], lastCol);

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'center' } });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    setStyle(r, C_STT, { alignment: { horizontal: 'center' } });
    setStyle(r, C_DATE, { alignment: { horizontal: 'center' } });
    for (let s = 0; s < SIZE_BUCKETS.length; s++) {
      setStyle(r, C_SIZE0 + s, { alignment: { horizontal: 'center' } });
    }
  }

  styleTotalRow(rTotalRow, lastCol, isMoneyCol);
  styleSignature(signature);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');

  const chiHo = buildChiHoSummarySheet(rows, { seller, customer, resolveFeeName }, bucketOf);
  if (chiHo.rowCount > 0) {
    XLSX.utils.book_append_sheet(workbook, chiHo.ws, 'TỔNG HỢP CHI PHÍ CHI HỘ');
  }

  return { workbook, rowCount: rows.length };
};
