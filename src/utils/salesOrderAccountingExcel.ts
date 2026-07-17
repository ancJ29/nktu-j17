

import * as XLSX from 'xlsx-js-style';
import type { Customer, SalesOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { orderNeedsVAT, resolveOrderVatRate } from '@/utils/salesOrderPricing';

export type SalesOrderAccountingExportOptions = {
  
  getCustomerByCode: (code: string) => Customer | undefined;
  
  employeeCodes: ReadonlyMap<string, string>;
  
  fallbackVatRate: number;
};

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

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
] as const;

const COL_WIDTHS = [12, 12, 14, 12, 12, 40, 30, 14, 8, 16, 14, 14, 16, 18, 12, 12];

const FMT_QTY_PRICE = '#,##0.00';
const FMT_MONEY = '#,##0';
const QTY_COL = 9;
const PRICE_COL = 10;
const VAT_COL = 11;
const TOTAL_COL = 12;
const NUMERIC_COLS: ReadonlyArray<readonly [number, string]> = [
  [QTY_COL, FMT_QTY_PRICE],
  [PRICE_COL, FMT_QTY_PRICE],
  [VAT_COL, FMT_MONEY],
  [TOTAL_COL, FMT_MONEY],
];

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;

function resolvePeriodLabel(orders: ReadonlyArray<SalesOrder>): string {
  let latest = 0;
  for (const o of orders) {
    const t = new Date((o.extra?.orderDate ?? o.createdAt) as string | number).getTime();
    if (!Number.isNaN(t)) latest = Math.max(latest, t);
  }
  const d = latest ? new Date(latest) : new Date();
  return `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export const exportSalesOrdersToAccountingExcel = (
  orders: ReadonlyArray<SalesOrder>,
  { getCustomerByCode, employeeCodes, fallbackVatRate }: SalesOrderAccountingExportOptions,
): void => {
  const colCount = HEADERS.length;
  const lastCol = colCount - 1;

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
        '', // thanh toán — left blank
      ]);
    }
  }

  
  const titleRow = new Array(colCount).fill('');
  titleRow[0] = TITLE;
  const periodRow = new Array(colCount).fill('');
  periodRow[0] = resolvePeriodLabel(orders);

  const R_TITLE = 0;
  const R_PERIOD = 1;
  const R_HEADER = 2;
  const R_FIRST_DATA = 3;

  const worksheet = XLSX.utils.aoa_to_sheet([titleRow, periodRow, [...HEADERS], ...dataRows]);
  worksheet['!cols'] = COL_WIDTHS.map((width) => ({ width }));
  
  worksheet['!merges'] = [
    { s: { r: R_TITLE, c: 0 }, e: { r: R_TITLE, c: lastCol } },
    { s: { r: R_PERIOD, c: 0 }, e: { r: R_PERIOD, c: lastCol } },
  ];

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = (worksheet[ref] ?? (worksheet[ref] = { t: 's', v: '' })) as StyledCell;
    cell.s = { ...(cell.s ?? {}), ...style };
  };

  
  setStyle(R_TITLE, 0, { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } });
  setStyle(R_PERIOD, 0, {
    font: { bold: true, italic: true, sz: 12 },
    alignment: { horizontal: 'center' },
  });

  
  
  for (let c = 0; c <= lastCol; c++) {
    setStyle(R_HEADER, c, {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: HEADER_FILL,
      border: ALL_BORDERS,
    });
  }

  
  for (let i = 0; i < dataRows.length; i++) {
    const r = R_FIRST_DATA + i;
    for (const [col, fmt] of NUMERIC_COLS) {
      const ref = XLSX.utils.encode_cell({ r, c: col });
      const cell = worksheet[ref] as
        (XLSX.CellObject & { s?: Record<string, unknown> }) | undefined;
      if (cell && cell.t === 'n') {
        cell.z = fmt;
        cell.s = { ...(cell.s ?? {}), alignment: { horizontal: 'right' } };
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bán hàng');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `sales_orders_accounting_${yyyy}-${mm}-${dd}.xlsx`);
};
