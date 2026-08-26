import * as XLSX from 'xlsx-js-style';
import type { TransportOrder } from '@/types';
import {
  feeKey,
  isBillableFee,
  readFeeLines,
} from '@/pages/transport-orders/transportOrderPricing';
import { SERVICE_FEE_COLUMNS, buildBangKeWorksheet, type BangKeLayout } from './type1BangKe';
import type { CustomerReportBuilder } from './types';

const TYPE2_LAYOUT: BangKeLayout = {
  serviceColumns: SERVICE_FEE_COLUMNS.filter((c) => c.key !== 'demurrage').flatMap((c) =>
    c.key === 'freight' ? [c, { feeValue: 'PHU_PHI_DAU', header: 'PHỤ PHÍ DẦU' }] : [c],
  ),

  chiHoSlots: ['amount', 'invoiceNo', 'name'],

  reservedChiHo: [{ feeValue: 'PHI_NEO_XE', header: 'PHÍ NEO XE', slots: ['amount'] }],

  periodPrefix: 'T',
};

const BORDER_GATE_FEE = 'PHI_QUA_KHAU';

const carriesBorderGateFee = (
  order: TransportOrder,
  resolveFeeName: (value: string) => string,
): boolean => {
  const key = feeKey(resolveFeeName(BORDER_GATE_FEE));
  return readFeeLines(order).some(
    (f) => isBillableFee(f) && (f.amount || 0) > 0 && feeKey(resolveFeeName(f.label)) === key,
  );
};

const SHEETS: ReadonlyArray<{
  tab: string;
  titleSuffix: string;
  belongs: (order: TransportOrder, resolveFeeName: (value: string) => string) => boolean;
}> = [
  {
    tab: 'HÀNG ĐIỀU',
    titleSuffix: '- ĐIỀU',
    belongs: (o, r) => !carriesBorderGateFee(o, r),
  },
  {
    tab: 'HÀNG CỬA KHẨU',
    titleSuffix: '- HÀNG CỬA KHẨU',
    belongs: carriesBorderGateFee,
  },
];

export const buildCustomerReportType2: CustomerReportBuilder = (orders, input) => {
  const workbook = XLSX.utils.book_new();
  let rowCount = 0;

  for (const sheet of SHEETS) {
    const { ws, rowCount: n } = buildBangKeWorksheet(
      orders.filter((o) => sheet.belongs(o, input.resolveFeeName)),
      { ...input, titleSuffix: sheet.titleSuffix },
      TYPE2_LAYOUT,
    );
    if (n === 0) continue;
    XLSX.utils.book_append_sheet(workbook, ws, sheet.tab);
    rowCount += n;
  }

  return { workbook, rowCount };
};
