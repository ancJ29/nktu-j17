import { SERVICE_FEE_COLUMNS, buildBangKeSheet, type BangKeLayout } from './type1BangKe';
import type { CustomerReportBuilder } from './types';

const TYPE3_LAYOUT: BangKeLayout = {
  serviceColumns: SERVICE_FEE_COLUMNS.filter((c) => c.key !== 'handling'),

  chiHoSlots: ['amount', 'invoiceNo', 'name'],
};

export const buildCustomerReportType3: CustomerReportBuilder = (orders, input) =>
  buildBangKeSheet(orders, input, TYPE3_LAYOUT);
