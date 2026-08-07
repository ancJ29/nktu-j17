import type { ResolvedStatusOption } from '@/utils/permission';
import type { Customer, SalesOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { orderNeedsVAT, resolveOrderVatRate } from '@/utils/salesOrderPricing';
import {
  FMT_MONEY,
  FMT_QTY_PRICE,
  type NumericColumnFormat,
  buildAccountingWorksheet,
  resolveAccountingPeriodLabel,
  writeAccountingWorkbook,
} from '@/utils/accountingExcelSheet';

export type SalesOrderAccountingExportOptions = {
  getCustomerByCode: (code: string) => Customer | undefined;

  employeeCodes: ReadonlyMap<string, string>;

  fallbackVatRate: number;

  resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
};

const TITLE = 'SỔ CHI TIẾT BÁN HÀNG';
const HEADERS = [
  'ngày đặt',
  'ngày giao',
  'số đơn hàng',
  'Ngày hóa đơn',
  'Số hóa đơn',
  'Diễn giải',
  'Tên khách hàng',
  'Mã số thuế',
  'ĐVT',
  'Tổng số lượng bán',
  'Đơn giá',
  'Thuế GTGT',
  'Tổng thanh toán',
  'Mã nhân viên bán hàng',
  'po',
  'thanh toán',

  'Trạng thái',
] as const;

const COL_WIDTHS = [12, 12, 14, 12, 12, 40, 30, 14, 8, 16, 14, 14, 16, 18, 12, 12, 16];

const QTY_COL = 9;
const PRICE_COL = 10;
const VAT_COL = 11;
const TOTAL_COL = 12;
const NUMERIC_COLS: ReadonlyArray<NumericColumnFormat> = [
  [QTY_COL, FMT_QTY_PRICE],
  [PRICE_COL, FMT_QTY_PRICE],
  [VAT_COL, FMT_MONEY],
  [TOTAL_COL, FMT_MONEY],
];

export const exportSalesOrdersToAccountingExcel = (
  orders: ReadonlyArray<SalesOrder>,
  {
    getCustomerByCode,
    employeeCodes,
    fallbackVatRate,
    resolveStatus,
  }: SalesOrderAccountingExportOptions,
): void => {
  const dataRows: (string | number)[][] = [];
  for (const o of orders) {
    const e = o.extra ?? {};
    const orderDate = formatDate(e.orderDate ?? o.createdAt);
    const deliveryDate = e.deliveryDate ? formatDate(e.deliveryDate) : '';
    const customerName = resolveSalesOrderCustomerName(o, getCustomerByCode) ?? '';
    const taxCode = e.customerCode ? (getCustomerByCode(e.customerCode)?.extra?.taxCode ?? '') : '';
    const staffCode = e.assignedStaff ? (employeeCodes.get(e.assignedStaff) ?? '') : '';
    const poNumber = e.customerPONumber ?? '';
    const vatRate = orderNeedsVAT(e) ? resolveOrderVatRate(e, fallbackVatRate) : 0;

    const statusLabel = resolveStatus(e.status).label;

    for (const item of o.items ?? []) {
      if (item.role === 'set-component') continue;
      const lineSubtotal = (item.quantity ?? 0) * (item.unitPrice ?? 0);
      const vatAmount = lineSubtotal * vatRate;
      dataRows.push([
        orderDate,
        deliveryDate,
        o.orderNumber,
        '',
        '',
        item.productName ?? '',
        customerName,
        taxCode,
        item.unit ?? '',
        item.quantity ?? 0,
        item.unitPrice ?? 0,
        vatAmount,
        lineSubtotal + vatAmount,
        staffCode,
        poNumber,
        '',
        statusLabel,
      ]);
    }
  }

  const worksheet = buildAccountingWorksheet({
    title: TITLE,
    periodLabel: resolveAccountingPeriodLabel(orders.map((o) => o.extra?.orderDate ?? o.createdAt)),
    headers: HEADERS,
    colWidths: COL_WIDTHS,
    dataRows,
    numericCols: NUMERIC_COLS,
  });

  writeAccountingWorkbook(worksheet, {
    sheetName: 'Bán hàng',
    fileNamePrefix: 'sales_orders_accounting',
  });
};
