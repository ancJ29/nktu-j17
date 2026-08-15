import { SERVICE_FEE_COLUMNS, buildBangKeSheet, type BangKeLayout } from './type1BangKe';
import type { CustomerReportBuilder } from './types';

const TYPE2_LAYOUT: BangKeLayout = {
  serviceColumns: SERVICE_FEE_COLUMNS.filter((c) => c.key !== 'demurrage').flatMap((c) =>
    c.key === 'freight' ? [c, { feeValue: 'PHU_PHI_DAU', header: 'PHỤ PHÍ DẦU' }] : [c],
  ),

  chiHoSlots: ['name', 'amount', 'invoiceNo'],

  reservedChiHo: [{ feeValue: 'PHI_NEO_XE', header: 'PHÍ NEO XE', slots: ['amount'] }],
};

export const buildCustomerReportType2: CustomerReportBuilder = (orders, input) =>
  buildBangKeSheet(orders, input, TYPE2_LAYOUT);
