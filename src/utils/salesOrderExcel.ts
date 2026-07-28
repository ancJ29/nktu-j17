import * as XLSX from 'xlsx';
import type { Customer, SalesOrder } from '@/types';
import type { ResolvedStatusOption, ResolvedTagOption } from '@/utils/permission';
import { formatDate } from '@/utils/dateFormat';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';

export type SalesOrderExportOptions = {
  language?: string;
  resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  resolveDeliveryMethod: (value: string | undefined | null) => string;

  employeeNames: ReadonlyMap<string, string>;

  getCustomerByCode: (code: string) => Customer | undefined;
  tagOptions: ReadonlyArray<ResolvedTagOption>;

  pricingEnabled?: boolean;
};

export const exportSalesOrdersToExcel = (
  orders: ReadonlyArray<SalesOrder>,
  {
    language,
    resolveStatus,
    resolveDeliveryMethod,
    employeeNames,
    tagOptions,
    getCustomerByCode,
    pricingEnabled = true,
  }: SalesOrderExportOptions,
): void => {
  const isVietnamese = language === 'vi';

  type ColumnKey =
    | 'orderNumber'
    | 'customerName'
    | 'status'
    | 'orderDate'
    | 'deliveryDate'
    | 'deliveryMethod'
    | 'assignedStaff'
    | 'totalAmount'
    | 'urgent'
    | 'tags'
    | 'cancelled'
    | 'notes';
  type Column = { key: ColumnKey; header: string; width: number };

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        orderNumber: 'Số đơn hàng',
        customerName: 'Khách hàng',
        status: 'Trạng thái',
        orderDate: 'Ngày đặt',
        deliveryDate: 'Ngày giao',
        deliveryMethod: 'Phương thức giao',
        assignedStaff: 'Nhân viên phụ trách',
        totalAmount: 'Tổng tiền',
        urgent: 'Khẩn',
        tags: 'Thẻ',
        cancelled: 'Đã hủy',
        notes: 'Ghi chú',
      }
    : {
        orderNumber: 'Order Number',
        customerName: 'Customer',
        status: 'Status',
        orderDate: 'Order Date',
        deliveryDate: 'Delivery Date',
        deliveryMethod: 'Delivery Method',
        assignedStaff: 'Assigned Staff',
        totalAmount: 'Total Amount',
        urgent: 'Urgent',
        tags: 'Tags',
        cancelled: 'Cancelled',
        notes: 'Notes',
      };

  const columns: Column[] = [
    { key: 'orderNumber', header: labels.orderNumber, width: 18 },
    { key: 'customerName', header: labels.customerName, width: 28 },
    { key: 'status', header: labels.status, width: 14 },
    { key: 'orderDate', header: labels.orderDate, width: 12 },
    { key: 'deliveryDate', header: labels.deliveryDate, width: 12 },
    { key: 'deliveryMethod', header: labels.deliveryMethod, width: 16 },
    { key: 'assignedStaff', header: labels.assignedStaff, width: 22 },
    ...(pricingEnabled
      ? [{ key: 'totalAmount' as const, header: labels.totalAmount, width: 14 }]
      : []),
    { key: 'urgent', header: labels.urgent, width: 8 },
    { key: 'tags', header: labels.tags, width: 24 },
    { key: 'cancelled', header: labels.cancelled, width: 10 },
    { key: 'notes', header: labels.notes, width: 36 },
  ];

  const yes = isVietnamese ? 'Có' : 'Yes';
  const no = '';

  const tagLabelByValue = new Map<string, string>();
  for (const tag of tagOptions) tagLabelByValue.set(tag.value, tag.label);

  const dataRows = orders.map((o) => {
    const e = o.extra ?? {};
    const cells: Record<ColumnKey, string | number> = {
      orderNumber: o.orderNumber,
      customerName: resolveSalesOrderCustomerName(o, getCustomerByCode) ?? '',
      status: resolveStatus(e.status).label,
      orderDate: formatDate(o.createdAt),
      deliveryDate: e.deliveryDate ? formatDate(e.deliveryDate) : '',
      deliveryMethod: resolveDeliveryMethod(e.deliveryMethod) || '',
      assignedStaff: e.assignedStaff ? (employeeNames.get(e.assignedStaff) ?? '') : '',
      totalAmount: typeof o.totalAmount === 'number' ? o.totalAmount : 0,
      urgent: e.isUrgent ? yes : no,
      tags: (e.tags ?? []).map((v) => tagLabelByValue.get(v) ?? v).join('; '),
      cancelled: e.cancellation ? yes : no,
      notes: o.notes ?? '',
    };
    return columns.map((c) => cells[c.key]);
  });

  const headerRow = columns.map((c) => c.header);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const workbook = XLSX.utils.book_new();
  const sheetName = isVietnamese ? 'Đơn hàng' : 'Sales Orders';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `sales_orders_export_${yyyy}-${mm}-${dd}.xlsx`);
};
