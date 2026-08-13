import type * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';

export const DEFAULT_CUSTOMER_REPORT_TYPE = 1;

export type CustomerReportInput = {
  seller: { name: string; address: string; taxCode: string };

  customer: { name: string; address?: string; taxCode?: string };

  resolveShipmentType: (value: string) => string;
  resolveContainerSize: (value: string) => string;

  resolveFeeName: (value: string) => string;

  getTruckPlate: (truckId: string | undefined | null) => string | undefined;

  titleSuffix?: string;
};

export type CustomerReportResult = { workbook: XLSX.WorkBook; rowCount: number };

export type CustomerReportBuilder = (
  orders: ReadonlyArray<TransportOrder>,
  input: CustomerReportInput,
) => CustomerReportResult;

export type CustomerReportType = {
  id: number;

  label: string;

  fileStem: string;
  build: CustomerReportBuilder;
};
