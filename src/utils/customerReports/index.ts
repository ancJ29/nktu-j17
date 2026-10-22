import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
import { buildCustomerReportType1 } from './type1BangKe';
import { buildCustomerReportType2 } from './type2ForGiaAn';
import { buildCustomerReportType3 } from './type3ForSaphia';
import { buildCustomerReportType4 } from './type4ForVietHoaPhat';
import { buildCustomerReportType5 } from './type5ForCatHai';
import { buildCustomerReportType6 } from './type6ForPhucHuy';
import { buildCustomerReportType7 } from './type7ForThuySanQuocTe';
import { buildCustomerReportType8 } from './type8ForAtb';
import { buildCustomerReportType9 } from './type9ForHaCatA';
import { buildCustomerReportType10 } from './type10ForVs';
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
  3: {
    id: 3,
    label: 'Bảng kê vận chuyển (SAPHIA)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType3,
  },
  4: {
    id: 4,
    label: 'Bảng kê vận chuyển (VIỆT HOA PHÁT)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType4,
  },
  5: {
    id: 5,
    label: 'Bảng kê vận chuyển (CÁT HẢI)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType5,
  },
  6: {
    id: 6,
    label: 'Bảng kê vận chuyển (PHÚC HUY)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType6,
  },
  7: {
    id: 7,
    label: 'Bảng kê vận chuyển (THỦY SẢN QUỐC TẾ)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType7,
  },
  8: {
    id: 8,
    label: 'Bảng kê vận chuyển (ATB)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType8,
  },
  9: {
    id: 9,
    label: 'Bảng kê vận chuyển (HÀ CÁT Á)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType9,
  },
  10: {
    id: 10,
    label: 'Bảng kê vận chuyển (VS)',
    fileStem: 'bang_ke',
    build: buildCustomerReportType10,
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
