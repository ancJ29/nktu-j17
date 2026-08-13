import * as XLSX from 'xlsx';
import type { TransportOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { orderPlanDate } from '@/pages/transport-orders/planDate';
import { orderTotals } from '@/pages/transport-orders/transportOrderPricing';
import { truckNameWithPlate } from '@/pages/transport-orders/truckDisplay';

export type TransportOrderExportOptions = {
  language?: string;

  resolveStatus: (value: string) => string;

  resolveShipmentType: (value: string) => string;
  resolveContainerSize: (value: string) => string;

  getTruckPlate: (truckId: string | undefined | null) => string | undefined;

  resolveCustomer: (code: string) => string | undefined;

  includeMoney?: boolean;
};

export const exportTransportOrdersToExcel = (
  orders: ReadonlyArray<TransportOrder>,
  {
    language,
    resolveStatus,
    resolveShipmentType,
    resolveContainerSize,
    getTruckPlate,
    resolveCustomer,
    includeMoney = true,
  }: TransportOrderExportOptions,
): void => {
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
    | 'notes'
    | 'feeName';

  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        orderNumber: 'Số đơn hàng',
        date: 'Ngày',
        shipmentType: 'Loại hình',
        feeName: 'Chi phí',
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
        feeName: 'Fee Name',
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

  const columns: Column[] = [
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
          { key: 'subtotal', header: labels.subtotal, width: 14 },
          { key: 'vatAmount', header: labels.vatAmount, width: 12 },
          { key: 'grandTotal', header: labels.grandTotal, width: 14 },
          { key: 'advanceAmount', header: labels.advanceAmount, width: 12 },
          { key: 'balanceDue', header: labels.balanceDue, width: 14 },
        ] as Column[])
      : []),
    { key: 'cancelled', header: labels.cancelled, width: 8 },
    { key: 'notes', header: labels.notes, width: 36 },
  ];

  const yes = isVietnamese ? 'Có' : 'Yes';
  const no = '';

  const truckCell = (name: string, truckId: string | undefined) =>
    truckNameWithPlate(name, getTruckPlate(truckId));

  const dataRows = orders.map((o) => {
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

    const cells: Record<ColumnKey, string | number> = {
      orderNumber: o.orderNumber,
      feeName: '',
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
    return columns.map((c) => cells[c.key]);
  });

  const headerRow = columns.map((c) => c.header);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  const sheetName = isVietnamese ? 'Đơn vận chuyển' : 'Transport Orders';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `transport_orders_export_${yyyy}-${mm}-${dd}.xlsx`);
};
