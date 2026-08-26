import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  readFeeLines,
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

const FREIGHT_FEE_VALUE = 'PHI_VAN_CHUYEN';

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
): { ws: XLSX.WorkSheet; lineCount: number } => {
  const lines = rows.flatMap((order) =>
    readFeeLines(order)
      .filter(
        (f) =>
          f.kind === 'passthrough' &&
          isBillableFee(f) &&
          ((f as TransportOrderFee).amount || 0) !== 0,
      )
      .map((fee) => ({ order, fee })),
  );

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
  lines.forEach(({ order, fee }, i) => {
    const row: CellValue[] = new Array(colCount).fill('');
    row[D_STT] = i + 1;
    row[D_DECL] = order.declarationNumber ?? '';

    row[D_QTY] = 1;
    row[D_PRICE] = (fee as TransportOrderFee).amount || 0;
    row[D_DESC] = resolveFeeName(fee.label);
    aoa.push(row);
    total += (fee as TransportOrderFee).amount || 0;
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
  setStyle(rDivider, 0, { alignment: { horizontal: 'center' } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  setStyle(rNumber, 0, { alignment: { horizontal: 'center' } });
  setStyle(rDear, 0, { font: { bold: true } });

  for (let c = 0; c <= lastCol; c++) {
    setStyle(rHead, c, {
      font: { bold: true },
      border: ALL_BORDERS,
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },

      fill: MANUAL_COLS.includes(c) ? MANUAL_FILL : HEADER_FILL,
    });
  }

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

  return { ws, lineCount: lines.length };
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
  const rows = orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));

  const freightKey = feeKey(resolveFeeName(FREIGHT_FEE_VALUE));

  const splitMoney = (o: TransportOrder) => {
    let freight = 0;
    let surcharge = 0;
    for (const f of readFeeLines(o)) {
      if (!isBillableFee(f)) continue;
      const amount = (f as TransportOrderFee).amount || 0;
      if (feeKey(resolveFeeName(f.label)) === freightKey) freight += amount;
      else surcharge += amount;
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
  leaf(C_DATE, 'NGÀY');
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_FROM, 'NƠI ĐI');
  leaf(C_TO, 'NƠI ĐẾN');
  leaf(C_DROP, 'NƠI HẠ');
  leaf(C_DECL, 'SỐ TỜ KHAI');
  leaf(C_CONT, 'SỐ CONT');
  group(
    C_SIZE0,
    C_SIZE0 + SIZE_BUCKETS.length - 1,
    'LOẠI',
    SIZE_BUCKETS.map((b) => b.header),
  );
  leaf(C_FREIGHT, 'CƯỚC CHƯA VAT');
  leaf(C_SURCHARGE, 'PHỤ PHÍ');
  leaf(C_TOTAL, 'TỔNG THÀNH TIỀN');
  aoa.push(head1, head2);

  const truckLabel = (name: string, truckId: string | undefined) => getTruckPlate(truckId) ?? name;

  let sumFreight = 0;
  let sumSurcharge = 0;
  const sizeCounts = SIZE_BUCKETS.map(() => 0);
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

    row[C_FROM] = o.route?.pickup ?? '';
    row[C_TO] = o.route?.stuffing ?? '';
    row[C_DROP] = o.route?.dropoff ?? '';

    row[C_DECL] = o.declarationNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';
    const s = sizeBucketIndex(o.containerSize);
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
    if (c >= C_FROM && c <= C_DROP) return { wch: 22 };
    if (c === C_DECL || c === C_CONT) return { wch: 16 };
    if (c >= C_SIZE0 && c < C_FREIGHT) return { wch: 6 };
    if (c === C_TOTAL) return { wch: 18 };
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
  const isMoneyCol = (c: number) => c >= C_FREIGHT && c <= C_TOTAL;

  setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  setStyle(rDear, 0, { font: { bold: true } });

  for (const r of [rHead1, rHead2]) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, {
        font: { bold: true },
        fill: HEADER_FILL,
        border: ALL_BORDERS,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      });
    }
  }

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

  for (let c = 0; c <= lastCol; c++) {
    setStyle(rTotalRow, c, { font: { bold: true }, border: ALL_BORDERS, fill: TOTAL_FILL });
    if (isMoneyCol(c)) setFmt(rTotalRow, c, FMT_MONEY_DASH);
  }

  for (const c of [0, cSignRight]) {
    setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');

  const chiHo = buildChiHoSummarySheet(rows, { seller, customer, resolveFeeName });
  if (chiHo.lineCount > 0) {
    XLSX.utils.book_append_sheet(workbook, chiHo.ws, 'TỔNG HỢP CHI PHÍ CHI HỘ');
  }

  return { workbook, rowCount: rows.length };
};
