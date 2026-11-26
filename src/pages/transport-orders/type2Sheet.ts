import type { TransportOrderType2Sheet } from '@/types';
import { resolveCustomerReportType } from '@/utils/permission';
import { SHEET_FLAG_REPORT_TYPES } from '@/utils/customerReports/types';

export type Type2SheetValue = TransportOrderType2Sheet | '';

const printsSheetFlag = (customerCode: string): boolean =>
  SHEET_FLAG_REPORT_TYPES.has(resolveCustomerReportType(customerCode));

export function showsType2Sheet(customerCode: string, sheet: Type2SheetValue): boolean {
  return printsSheetFlag(customerCode) || sheet !== '';
}

export function type2SheetMissing(
  isEdit: boolean,
  customerCode: string,
  sheet: Type2SheetValue,
): boolean {
  return !isEdit && sheet === '' && printsSheetFlag(customerCode);
}
