import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
import { buildCustomerReportType1 } from './type1BangKe';
import { buildCustomerReportType2 } from './type2ForGiaAn';
import { DEFAULT_CUSTOMER_REPORT_TYPE } from './types';
import type { CustomerReportInput, CustomerReportType } from './types';

export type { CustomerReportInput, CustomerReportResult } from './types';
export { DEFAULT_CUSTOMER_REPORT_TYPE } from './types';

export const CUSTOMER_REPORT_TYPES: Record<number, CustomerReportType> = {
  1: {
    id: 1,
    label: 'Bảng kê vận chuyển',
    fileStem: 'bang_ke',
    build: buildCustomerReportType1,
  },

  2: {
    id: 2,
    label: 'Bảng kê vận chuyển (GIA AN)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType2,
  },
};

export const customerReportTypeOptions = (): CustomerReportType[] =>
  Object.values(CUSTOMER_REPORT_TYPES).sort((a, b) => a.id - b.id);

export function exportCustomerReport(
  typeId: number,
  orders: ReadonlyArray<TransportOrder>,
  input: CustomerReportInput & { fileTag?: string },
): number {
  const type =
    CUSTOMER_REPORT_TYPES[typeId] ?? CUSTOMER_REPORT_TYPES[DEFAULT_CUSTOMER_REPORT_TYPE]!;
  const { workbook, rowCount } = type.build(orders, input);
  if (rowCount === 0) return 0;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const tag = input.fileTag ? `${input.fileTag}_` : '';
  XLSX.writeFile(workbook, `${type.fileStem}_${tag}${yyyy}-${mm}-${dd}.xlsx`);
  return rowCount;
}
