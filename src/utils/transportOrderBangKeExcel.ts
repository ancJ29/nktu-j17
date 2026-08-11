import * as XLSX from 'xlsx-js-style';
import type { TransportOrder, TransportOrderFee } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate, orderPlanSortKey } from '@/pages/transport-orders/planDate';
import {
  isBillableFee,
  orderTotals,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };
type CellValue = string | number;

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;
const FMT_MONEY = '#,##0';

const FMT_MONEY_DASH = '#,##0;-#,##0;"-"';

export type BangKeTemplateSettings = {
  serviceFeeColumns?: string[];

  otherFeesColumn?: boolean;

  noteColumn?: 'auto' | 'always' | 'never';

  footerSummary?: boolean;
};

export type TransportOrderBangKeOptions = {
  seller: { name: string; address: string; taxCode: string };

  customer: { name: string; address?: string; taxCode?: string };

  resolveShipmentType: (value: string) => string;
  resolveContainerSize: (value: string) => string;

  getTruckPlate: (truckId: string | undefined | null) => string | undefined;

  template?: BangKeTemplateSettings;

  titleSuffix?: string;
};

const feeKey = (label: string) => label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

const OTHER_FEES_KEY = '__other__';

function bangKePeriodLabel(orders: ReadonlyArray<TransportOrder>): string {
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

function billedLines(order: TransportOrder, kind: TransportOrderFee['kind']): TransportOrderFee[] {
  return readFeeLines(order).filter((f) => f.kind === kind && isBillableFee(f));
}

export function buildTransportOrderBangKeWorkbook(
  orders: ReadonlyArray<TransportOrder>,
  {
    seller,
    customer,
    resolveShipmentType,
    resolveContainerSize,
    getTruckPlate,
    template,
    titleSuffix,
  }: TransportOrderBangKeOptions,
): { workbook: XLSX.WorkBook; rowCount: number } {
  const rows = orders
    .filter((o) => !o.extra?.isDeleted && !o.extra?.cancellation)
    .sort((a, b) => orderPlanSortKey(a) - orderPlanSortKey(b));

  const feeCols: { key: string; header: string }[] = [];
  const feeColIndex = new Map<string, number>();
  const addFeeCol = (label: string) => {
    feeColIndex.set(feeKey(label), feeCols.length);
    feeCols.push({ key: feeKey(label), header: label.trim().toLocaleUpperCase('vi') });
  };
  const configuredColumns = (template?.serviceFeeColumns ?? [])
    .map((l) => l.trim())
    .filter(Boolean);
  for (const label of configuredColumns) {
    if (!feeColIndex.has(feeKey(label))) addFeeCol(label);
  }

  let otherColIndex = -1;
  if (configuredColumns.length > 0 && (template?.otherFeesColumn ?? true)) {
    otherColIndex = feeCols.length;
    feeCols.push({ key: OTHER_FEES_KEY, header: 'PHÍ KHÁC' });
  }
  for (const o of rows) {
    for (const fee of billedLines(o, 'service')) {
      if (!feeColIndex.has(feeKey(fee.label)) && otherColIndex < 0) addFeeCol(fee.label);
    }
  }

  const feeColOf = (label: string) => feeColIndex.get(feeKey(label)) ?? otherColIndex;

  const sizeValues: string[] = [];
  for (const o of rows) {
    if (o.containerSize && !sizeValues.includes(o.containerSize)) sizeValues.push(o.containerSize);
  }
  if (sizeValues.length === 0) sizeValues.push('20', '40');

  let chiHoGroups = 0;
  for (const o of rows) chiHoGroups = Math.max(chiHoGroups, billedLines(o, 'passthrough').length);

  const noteMode = template?.noteColumn ?? 'auto';
  const hasNotes =
    noteMode === 'always' || (noteMode === 'auto' && rows.some((o) => !!o.notes?.trim()));
  const showFooter = template?.footerSummary ?? true;

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
  const C_TYPE = C_SIZE0 + sizeValues.length;
  const C_PICKUP = C_TYPE + 1;
  const C_STUFFING = C_PICKUP + 1;
  const C_DROPOFF = C_STUFFING + 1;
  const C_FEE0 = C_DROPOFF + 1;
  const C_VAT = C_FEE0 + feeCols.length;
  const C_TOTAL = C_VAT + 1;
  const C_NOTE = hasNotes ? C_TOTAL + 1 : -1;
  const C_CHIHO0 = (hasNotes ? C_NOTE : C_TOTAL) + 1;
  const colCount = C_CHIHO0 + chiHoGroups * 3;
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
  leaf(C_DATE, 'NGÀY V/C');
  leaf(C_TRUCK, 'SỐ XE');
  leaf(C_BL, 'SỐ B/L; B/K');
  leaf(C_CONT, 'SỐ CONT');
  group(
    C_SIZE0,
    C_SIZE0 + sizeValues.length - 1,
    'SẢN LƯỢNG',
    sizeValues.map((v) => resolveContainerSize(v)),
  );
  leaf(C_TYPE, 'LOẠI HÌNH');
  group(C_PICKUP, C_DROPOFF, 'TUYẾN DỊCH VỤ', ['NƠI LẤY', 'NƠI ĐÓNG/RÚT HÀNG', 'NƠI HẠ']);
  group(C_FEE0, C_VAT, 'PHÍ DỊCH VỤ', [...feeCols.map((f) => f.header), vatHeader]);
  leaf(C_TOTAL, 'TỔNG CỘNG');
  if (hasNotes) leaf(C_NOTE, 'NOTE');
  if (chiHoGroups > 0) {
    group(
      C_CHIHO0,
      lastCol,
      'PHÍ CHI HỘ',
      Array.from({ length: chiHoGroups }, () => ['SỐ TIỀN', 'SỐ HĐ', 'TÊN PHÍ']).flat(),
    );
  }
  aoa.push(head1, head2);

  const truckLabel = (name: string, truckId: string | undefined) => getTruckPlate(truckId) ?? name;

  let sumService = 0;
  let sumVat = 0;
  let sumChiHo = 0;
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
    row[C_BL] = o.billNumber ?? '';
    row[C_CONT] = o.containerNumber ?? '';
    if (o.containerSize) {
      const s = sizeValues.indexOf(o.containerSize);
      if (s >= 0) row[C_SIZE0 + s] = 1;
    }
    row[C_TYPE] = o.shipmentType ? resolveShipmentType(o.shipmentType).toLocaleUpperCase('vi') : '';
    row[C_PICKUP] = o.route?.pickup ?? '';
    row[C_STUFFING] = o.route?.stuffing ?? '';
    row[C_DROPOFF] = o.route?.dropoff ?? '';

    for (const fee of billedLines(o, 'service')) {
      const c = C_FEE0 + feeColOf(fee.label);
      const prev = typeof row[c] === 'number' ? (row[c] as number) : 0;
      const next = prev + (fee.amount || 0);
      if (next !== 0) row[c] = next;
    }

    const totals = orderTotals(o);
    if (totals.vatAmount !== 0) row[C_VAT] = totals.vatAmount;
    const serviceTotal = totals.serviceSubtotal + totals.vatAmount;
    if (serviceTotal !== 0) row[C_TOTAL] = serviceTotal;
    if (hasNotes) row[C_NOTE] = o.notes ?? '';

    billedLines(o, 'passthrough').forEach((fee, g) => {
      const c = C_CHIHO0 + g * 3;
      if (fee.amount) row[c] = fee.amount;
      row[c + 1] = fee.invoiceNo ?? '';
      row[c + 2] = fee.label;
      sumChiHo += fee.amount || 0;
    });

    sumService += totals.serviceSubtotal;
    sumVat += totals.vatAmount;
    aoa.push(row);
  });
  const rLastData = aoa.length - 1;

  const rTotalRow = aoa.length;
  {
    const row: CellValue[] = new Array(colCount).fill('');
    row[C_STT] = 'TOTAL';
    merges.push({ s: { r: rTotalRow, c: C_STT }, e: { r: rTotalRow, c: C_CONT } });
    sizeValues.forEach((v, s) => {
      row[C_SIZE0 + s] = rows.filter((o) => o.containerSize === v).length;
    });
    feeCols.forEach((_col, f) => {
      let sum = 0;
      for (const o of rows) {
        for (const fee of billedLines(o, 'service')) {
          if (feeColOf(fee.label) === f) sum += fee.amount || 0;
        }
      }
      row[C_FEE0 + f] = sum;
    });
    row[C_VAT] = sumVat;
    row[C_TOTAL] = sumService + sumVat;
    for (let g = 0; g < chiHoGroups; g++) {
      let sum = 0;
      for (const o of rows) sum += billedLines(o, 'passthrough')[g]?.amount ?? 0;
      row[C_CHIHO0 + g * 3] = sum;
    }
    aoa.push(row);
  }

  let rFirstSummary = -1;
  let rLastSummary = -1;
  if (showFooter) {
    blankRow();
    const summary = (label: string, value: number): number => {
      const r = aoa.length;
      const row: CellValue[] = new Array(colCount).fill('');
      row[0] = label;
      row[C_TOTAL] = value;
      aoa.push(row);
      merges.push({ s: { r, c: 0 }, e: { r, c: C_TOTAL - 1 } });
      return r;
    };
    rFirstSummary = summary('Số tiền cước vận chuyển:', sumService + sumVat);
    summary('Số tiền chi hộ:', sumChiHo);
    rLastSummary = summary('Tổng số tiền cần thanh toán:', sumService + sumVat + sumChiHo);
  }

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
    if (c === C_NOTE) return { wch: 22 };
    if (c >= C_CHIHO0 && (c - C_CHIHO0) % 3 === 1) return { wch: 10 };
    if (c >= C_CHIHO0 && (c - C_CHIHO0) % 3 === 2) return { wch: 14 };
    return { wch: 13 }; // fee / VAT / TỔNG CỘNG / chi hộ SỐ TIỀN
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
  const isMoneyCol = (c: number) =>
    (c >= C_FEE0 && c <= C_TOTAL) || (c >= C_CHIHO0 && (c - C_CHIHO0) % 3 === 0);

  setStyle(rSeller, 0, { font: { bold: true, sz: 13 } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 15 }, alignment: { horizontal: 'center' } });
  setStyle(rDear, 0, { font: { bold: true } });

  for (const r of [rHead1, rHead2]) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: HEADER_FILL,
        border: ALL_BORDERS,
      });
    }
  }

  for (let r = rFirstData; r <= rLastData; r++) {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, { border: ALL_BORDERS, alignment: { vertical: 'top', wrapText: true } });
      if (isMoneyCol(c)) setFmt(r, c, FMT_MONEY);
    }
    setStyle(r, C_STT, { alignment: { horizontal: 'center' } });
    setStyle(r, C_DATE, { alignment: { horizontal: 'center' } });
    setStyle(r, C_TYPE, { alignment: { horizontal: 'center' } });
    for (let s = 0; s < sizeValues.length; s++) {
      setStyle(r, C_SIZE0 + s, { alignment: { horizontal: 'center' } });
    }
  }

  for (let c = 0; c <= lastCol; c++) {
    setStyle(rTotalRow, c, { font: { bold: true }, border: ALL_BORDERS, fill: TOTAL_FILL });
    if (isMoneyCol(c)) setFmt(rTotalRow, c, FMT_MONEY_DASH);
  }

  for (let r = rFirstSummary; r >= 0 && r <= rLastSummary; r++) {
    setStyle(r, 0, { font: { bold: true }, alignment: { horizontal: 'right' } });
    setStyle(r, C_TOTAL, { font: { bold: true } });
    setFmt(r, C_TOTAL, FMT_MONEY);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'BẢNG KÊ');
  return { workbook, rowCount: rows.length };
}

export function exportTransportOrderBangKe(
  orders: ReadonlyArray<TransportOrder>,
  options: TransportOrderBangKeOptions & {
    fileTag?: string;
  },
): number {
  const { workbook, rowCount } = buildTransportOrderBangKeWorkbook(orders, options);
  if (rowCount === 0) return 0;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const tag = options.fileTag ? `${options.fileTag}_` : '';
  XLSX.writeFile(workbook, `bang_ke_${tag}${yyyy}-${mm}-${dd}.xlsx`);
  return rowCount;
}
