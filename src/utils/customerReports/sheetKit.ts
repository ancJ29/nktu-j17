import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import type { CustomerReportInput } from './types';

export type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
export type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
export const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
export const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
export const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;

export const MANUAL_FILL = { fgColor: { rgb: 'FFFF00' } } as const;
export const FMT_MONEY = '#,##0';

export const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

export function statementRows(orders: ReadonlyArray<TransportOrder>): TransportOrder[] {
  return orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));
}

const SIZE_BUCKET_KEYS = ['20', '40'] as const;

export function sizeBucketIndex(truckingSize: string | undefined): number {
  const digits = (truckingSize ?? '').trim().match(/^(\d+)/)?.[1];
  return digits ? SIZE_BUCKET_KEYS.findIndex((key) => key === digits) : -1;
}

export function bangKePeriodLabel(
  orders: ReadonlyArray<TransportOrder>,
  monthPrefix = 'THÁNG ',
): string {
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
    return `${monthPrefix}${now.getMonth() + 1}/${now.getFullYear()}`;
  }
  const from = new Date(earliest);
  const to = new Date(latest);
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `${monthPrefix}${from.getMonth() + 1}/${from.getFullYear()}`;
  }
  return `TỪ ${formatDate(earliest)} ĐẾN ${formatDate(latest)}`;
}

export function bangKeTitle(titleSuffix: string | undefined, period: string): string {
  const suffix = titleSuffix?.trim() ? ` ${titleSuffix.trim()}` : '';
  return `BẢNG KÊ VẬN CHUYỂN${suffix} ${period}`;
}

type TruckLabel = (name: string, truckId: string | undefined) => string;

export const truckLabeler =
  (getTruckPlate: CustomerReportInput['getTruckPlate']): TruckLabel =>
  (name, truckId) =>
    getTruckPlate(truckId) ?? name;

export function joinedPlates(order: TransportOrder, truckLabel: TruckLabel): string {
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

export function createSheetWriter(colCount: number) {
  const aoa: CellValue[][] = [];
  const merges: XLSX.Range[] = [];
  const emptyRow = (): CellValue[] => new Array(colCount).fill('');
  const blankRow = () => {
    aoa.push([]);
  };

  const banner = (text: string): number => {
    const r = aoa.length;
    const row = emptyRow();
    row[0] = text;
    aoa.push(row);
    merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    return r;
  };

  const letterhead = (
    seller: CustomerReportInput['seller'],
    customer: CustomerReportInput['customer'],
    title: string,
  ) => {
    const rSeller = banner(seller.name);
    banner(seller.address);
    banner(`MST: ${seller.taxCode}`);
    const rTitle = banner(title);
    const rDear = banner(`Kính gửi: ${customer.name}`);
    banner(`Địa chỉ: ${customer.address ?? ''}`);
    banner(`MST: ${customer.taxCode ?? ''}`);
    blankRow();
    return { rSeller, rTitle, rDear };
  };

  const headerBand = () => {
    const rHead1 = aoa.length;
    const rHead2 = rHead1 + 1;
    const head1 = emptyRow();
    const head2 = emptyRow();
    aoa.push(head1, head2);
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
    return { rHead1, rHead2, leaf, group };
  };

  const signatureRow = (customerName: string, sellerName: string) => {
    blankRow();
    const rSign = aoa.length;
    const cSignRight = Math.ceil(colCount / 2);
    const row = emptyRow();
    row[0] = customerName;
    row[cSignRight] = sellerName;
    aoa.push(row);
    merges.push({ s: { r: rSign, c: 0 }, e: { r: rSign, c: cSignRight - 1 } });
    merges.push({ s: { r: rSign, c: cSignRight }, e: { r: rSign, c: colCount - 1 } });
    return { rSign, cSignRight };
  };

  return { aoa, merges, emptyRow, blankRow, banner, letterhead, headerBand, signatureRow };
}

type StyleSpec = Record<string, unknown>;

export function makeStyler(ws: XLSX.WorkSheet) {
  const setStyle = (r: number, c: number, style: StyleSpec) => {
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

  const styleLetterhead = ({
    rSeller,
    rTitle,
    rDear,
  }: Record<'rSeller' | 'rTitle' | 'rDear', number>) => {
    setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
    setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
    setStyle(rDear, 0, { font: { bold: true } });
  };

  const styleHeaderBand = (
    rows: ReadonlyArray<number>,
    lastCol: number,
    fillAt: (c: number) => StyleSpec = () => HEADER_FILL,
  ) => {
    for (const r of rows) {
      for (let c = 0; c <= lastCol; c++) {
        setStyle(r, c, {
          font: { bold: true },
          fill: fillAt(c),
          border: ALL_BORDERS,
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        });
      }
    }
  };

  const styleTotalRow = (r: number, lastCol: number, isMoneyCol: (c: number) => boolean) => {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { font: { bold: true }, border: ALL_BORDERS, fill: TOTAL_FILL });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY_DASH);
    }
  };

  const styleSignature = ({ rSign, cSignRight }: { rSign: number; cSignRight: number }) => {
    for (const c of [0, cSignRight]) {
      setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
    }
  };

  return { setStyle, setFmt, styleLetterhead, styleHeaderBand, styleTotalRow, styleSignature };
}
