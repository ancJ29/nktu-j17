import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import type { CustomerReportBuilder } from './types';

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;
const FMT_MONEY = '#,##0';
const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

const SIZE_BUCKETS = [
  { key: '20', header: "20'" },
  { key: '40', header: "40'" },
] as const;

const sizeBucketIndex = (containerSize: string | undefined): number => {
  const digits = (containerSize ?? '').trim().match(/^(\d+)/)?.[1];
  return digits ? SIZE_BUCKETS.findIndex((b) => b.key === digits) : -1;
};

const FREIGHT_FEE_VALUE = 'PHI_VAN_CHUYEN';

function periodLabel(orders: ReadonlyArray<TransportOrder>): string {
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
  const rTitle = banner(`BẢNG KÊ VẬN CHUYỂN${suffix} ${periodLabel(rows)}`);
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
  return { workbook, rowCount: rows.length };
};
