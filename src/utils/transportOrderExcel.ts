import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
import { FMT_MONEY, type StyledCell } from '@/utils/accountingExcelSheet';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { orderPlanDate } from '@/pages/transport-orders/planDate';
import {
  feeKey,
  isBillableFee,
  orderTotals,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import { truckNameWithPlate } from '@/pages/transport-orders/truckDisplay';

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;

function exportedSpan(
  orders: ReadonlyArray<TransportOrder>,
): { from: number; to: number } | undefined {
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  for (const o of orders) {
    const t = new Date(orderPlanDate(o) as string | number | Date).getTime();
    if (Number.isNaN(t)) continue;
    from = Math.min(from, t);
    to = Math.max(to, t);
  }
  return Number.isFinite(from) ? { from, to } : undefined;
}

export type TransportOrderExportOptions = {
  language?: string;

  companyName?: string;

  resolveStatus: (value: string) => string;

  resolveShipmentType: (value: string) => string;
  resolveContainerSize: (value: string) => string;

  resolveFeeName: (value: string) => string;

  feeNames: ReadonlyArray<string>;

  getTruckPlate: (truckId: string | undefined | null) => string | undefined;

  resolveCustomer: (code: string) => string | undefined;

  includeMoney?: boolean;
};

function feeAmountsByName(
  order: TransportOrder,
  resolveFeeName: (value: string) => string,
): Map<string, number> {
  const amounts = new Map<string, number>();
  for (const fee of readFeeLines(order)) {
    if (!isBillableFee(fee)) continue;
    const key = feeKey(resolveFeeName(fee.label));
    if (!key) continue;
    amounts.set(key, (amounts.get(key) ?? 0) + fee.amount);
  }
  return amounts;
}

export const buildTransportOrderWorkbook = (
  orders: ReadonlyArray<TransportOrder>,
  {
    language,
    companyName,
    resolveStatus,
    resolveShipmentType,
    resolveContainerSize,
    resolveFeeName,
    feeNames,
    getTruckPlate,
    resolveCustomer,
    includeMoney = true,
  }: TransportOrderExportOptions,
): XLSX.WorkBook => {
  const isVietnamese = language === 'vi';

  type ColumnKey =
    | 'orderNumber'
    | 'date'
    | 'shipmentType'
    | 'containerNumber'
    | 'containerSize'
    | 'billNumber'
    | 'route'
    | 'truck'
    | 'driver'
    | 'customer'
    | 'status'
    | 'contractNo'
    | 'subtotal'
    | 'vatAmount'
    | 'grandTotal'
    | 'advanceAmount'
    | 'balanceDue'
    | 'cancelled'
    | 'notes';

  type Column = {
    key: ColumnKey;
    header: string;
    width: number;
    fee?: undefined;
    money?: boolean;
  };
  type FeeColumn = { key: string; header: string; width: number; fee: string; money: true };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        orderNumber: 'Số đơn hàng',
        date: 'Ngày',
        shipmentType: 'Loại hình',
        containerNumber: 'Số cont',
        containerSize: 'Loại cont',
        billNumber: 'Số B/L',
        route: 'Tuyến',
        truck: 'Xe',
        driver: 'Tài xế',
        customer: 'Khách hàng',
        status: 'Trạng thái',
        contractNo: 'HĐ vận chuyển',
        subtotal: 'Tạm tính',
        vatAmount: 'Tiền VAT',
        grandTotal: 'Tổng cộng',
        advanceAmount: 'Tạm ứng',
        balanceDue: 'Còn lại',
        cancelled: 'Đã hủy',
        notes: 'Ghi chú',
      }
    : {
        orderNumber: 'Order Number',
        date: 'Date',
        shipmentType: 'Shipment Type',
        containerNumber: 'Container No.',
        containerSize: 'Container Size',
        billNumber: 'B/L No.',
        route: 'Route',
        truck: 'Truck',
        driver: 'Driver',
        customer: 'Customer',
        status: 'Status',
        contractNo: 'Contract No.',
        subtotal: 'Subtotal',
        vatAmount: 'VAT',
        grandTotal: 'Grand Total',
        advanceAmount: 'Advance',
        balanceDue: 'Balance Due',
        cancelled: 'Cancelled',
        notes: 'Notes',
      };

  const rowFees = orders.map((o) =>
    includeMoney ? feeAmountsByName(o, resolveFeeName) : undefined,
  );

  const feeColumns: FeeColumn[] = [];
  const feeColumnKeys = new Set<string>();
  const addFeeColumn = (header: string, key: string) => {
    if (!key || feeColumnKeys.has(key)) return;
    feeColumnKeys.add(key);
    feeColumns.push({ key: `fee:${key}`, header, width: 14, fee: key, money: true });
  };
  if (includeMoney) {
    for (const name of feeNames) addFeeColumn(name.trim(), feeKey(name));
    for (const o of orders) {
      for (const fee of readFeeLines(o)) {
        if (!isBillableFee(fee)) continue;
        const label = resolveFeeName(fee.label).trim();
        addFeeColumn(label, feeKey(label));
      }
    }
  }

  const columns: (Column | FeeColumn)[] = [
    { key: 'orderNumber', header: labels.orderNumber, width: 16 },
    { key: 'date', header: labels.date, width: 12 },
    { key: 'shipmentType', header: labels.shipmentType, width: 12 },
    { key: 'containerNumber', header: labels.containerNumber, width: 14 },
    { key: 'containerSize', header: labels.containerSize, width: 10 },
    { key: 'billNumber', header: labels.billNumber, width: 14 },
    { key: 'route', header: labels.route, width: 44 },
    { key: 'truck', header: labels.truck, width: 24 },
    { key: 'driver', header: labels.driver, width: 22 },
    { key: 'customer', header: labels.customer, width: 24 },
    { key: 'status', header: labels.status, width: 14 },
    { key: 'contractNo', header: labels.contractNo, width: 16 },
    ...(includeMoney
      ? ([
          ...feeColumns,
          { key: 'subtotal', header: labels.subtotal, width: 14, money: true },
          { key: 'vatAmount', header: labels.vatAmount, width: 12, money: true },
          { key: 'grandTotal', header: labels.grandTotal, width: 14, money: true },
          { key: 'advanceAmount', header: labels.advanceAmount, width: 12, money: true },
          { key: 'balanceDue', header: labels.balanceDue, width: 14, money: true },
        ] as (Column | FeeColumn)[])
      : []),
    { key: 'cancelled', header: labels.cancelled, width: 8 },
    { key: 'notes', header: labels.notes, width: 36 },
  ];

  const yes = isVietnamese ? 'Có' : 'Yes';
  const no = '';

  const truckCell = (name: string, truckId: string | undefined) =>
    truckNameWithPlate(name, getTruckPlate(truckId));

  const dataRows = orders.map((o, i) => {
    const trips = o.isMultiTrip ? (o.trips ?? []) : [];
    const multi = trips.length > 0;

    const route = multi
      ? trips.map((tr, i) => `${i + 1}. ${tr.departure} → ${tr.destination}`).join('; ')
      : [o.route?.pickup, o.route?.stuffing, o.route?.dropoff].filter(Boolean).join(' → ');
    const truck = multi
      ? trips.map((tr, i) => `${i + 1}. ${truckCell(tr.truckPlate, tr.truckId)}`).join('; ')
      : truckCell(o.truckPlate, o.truckId);
    const driver = multi
      ? trips.map((tr, i) => `${i + 1}. ${tr.driverName}`).join('; ')
      : o.driverName;

    const totals = includeMoney ? orderTotals(o) : undefined;
    const fees = rowFees[i];

    const cells: Record<ColumnKey, string | number> = {
      orderNumber: o.orderNumber,

      date: formatDate(orderPlanDate(o)),
      shipmentType: o.shipmentType ? resolveShipmentType(o.shipmentType) : '',
      containerNumber: o.containerNumber ?? '',
      containerSize: o.containerSize ? resolveContainerSize(o.containerSize) : '',
      billNumber: o.billNumber ?? '',
      route,
      truck,
      driver,
      customer: o.customerCode
        ? (resolveCustomer(o.customerCode) ?? o.customerName ?? o.customerCode)
        : (o.customerName ?? ''),
      status: resolveStatus(o.status),
      contractNo: o.transportContractNo ?? '',
      subtotal: totals?.subtotal ?? '',
      vatAmount: totals?.vatAmount ?? '',
      grandTotal: totals?.grandTotal ?? '',
      advanceAmount: totals?.advanceAmount ?? '',
      balanceDue: totals?.balanceDue ?? '',
      cancelled: o.extra?.cancellation ? yes : no,
      notes: o.notes ?? '',
    };

    return columns.map((c) => (c.fee ? (fees?.get(c.fee) ?? '') : cells[c.key as ColumnKey]));
  });

  const headerRow = columns.map((c) => c.header);

  type BannerLine = { text: string; style: Record<string, unknown> };
  const TITLE_STYLE = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
  const SUB_STYLE = {
    font: { bold: true, italic: true, sz: 12 },
    alignment: { horizontal: 'center' },
  };
  const META_STYLE = {
    font: { italic: true, sz: 10, color: { rgb: '595959' } },
    alignment: { horizontal: 'center' },
  };

  const banner: BannerLine[] = [];
  if (companyName?.trim()) {
    banner.push({ text: companyName.trim().toLocaleUpperCase('vi'), style: SUB_STYLE });
  }
  banner.push({
    text: isVietnamese ? 'BÁO CÁO ĐƠN VẬN CHUYỂN' : 'TRANSPORT ORDERS REPORT',
    style: TITLE_STYLE,
  });
  const span = exportedSpan(orders);
  if (span) {
    banner.push({
      text: isVietnamese
        ? `Từ ${formatDate(span.from)} đến ${formatDate(span.to)}`
        : `From ${formatDate(span.from)} to ${formatDate(span.to)}`,
      style: SUB_STYLE,
    });
  }

  banner.push({
    text: isVietnamese
      ? `Tổng: ${orders.length} đơn · Xuất lúc ${formatDateTime(Date.now())}`
      : `Total: ${orders.length} orders · Exported ${formatDateTime(Date.now())}`,
    style: META_STYLE,
  });

  banner.push({ text: '', style: {} });

  const R_HEADER = banner.length;
  const R_FIRST_DATA = R_HEADER + 1;

  const bannerRows = banner.map((line) => [line.text]);
  const worksheet = XLSX.utils.aoa_to_sheet([...bannerRows, headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const lastCol = columns.length - 1;
  const lastRow = R_HEADER + dataRows.length;

  worksheet['!merges'] = banner.map((_, r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));

  const styleOf = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = (worksheet[ref] ?? (worksheet[ref] = { t: 's', v: '' })) as StyledCell;
    cell.s = { ...(cell.s ?? {}), ...style };
    return cell;
  };

  banner.forEach((line, r) => styleOf(r, 0, line.style));

  worksheet['!rows'] = [...Array(R_HEADER).fill({}), { hpt: 30 }];
  for (let c = 0; c <= lastCol; c++) {
    styleOf(R_HEADER, c, {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: HEADER_FILL,
      border: ALL_BORDERS,
    });
  }

  for (let i = 0; i < dataRows.length; i++) {
    const r = R_FIRST_DATA + i;
    for (let c = 0; c <= lastCol; c++) {
      styleOf(r, c, { border: ALL_BORDERS, alignment: { vertical: 'top' } });
    }
  }

  for (const [c, col] of columns.entries()) {
    if (!col.money) continue;
    for (let i = 0; i < dataRows.length; i++) {
      const ref = XLSX.utils.encode_cell({ r: R_FIRST_DATA + i, c });
      const cell = worksheet[ref] as StyledCell | undefined;
      if (cell?.t !== 'n') continue;
      cell.z = FMT_MONEY;
      cell.s = { ...(cell.s ?? {}), alignment: { horizontal: 'right', vertical: 'top' } };
    }
  }

  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: R_HEADER, c: 0 }, e: { r: lastRow, c: lastCol } }),
  };

  const workbook = XLSX.utils.book_new();
  const sheetName = isVietnamese ? 'Đơn vận chuyển' : 'Transport Orders';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
};

export const exportTransportOrdersToExcel = (
  orders: ReadonlyArray<TransportOrder>,
  options: TransportOrderExportOptions,
): void => {
  const workbook = buildTransportOrderWorkbook(orders, options);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `transport_orders_export_${yyyy}-${mm}-${dd}.xlsx`);
};
