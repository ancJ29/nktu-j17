import type { GoodsReceipt } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import {
  FMT_QTY_PRICE,
  type NumericColumnFormat,
  buildAccountingWorksheet,
  resolveAccountingPeriodLabel,
  writeAccountingWorkbook,
} from '@/utils/accountingExcelSheet';

export type GoodsReceiptAccountingExportOptions = {
  employeeCodes: ReadonlyMap<string, string>;

  resolveStatusLabel: (status: GoodsReceipt['status']) => string;
};

const TITLE = 'SỔ CHI TIẾT MUA HÀNG';
const HEADERS = [
  'ngày nhập',
  'số phiếu',
  'nhà cung cấp',
  'kho',
  'Diễn giải',
  'mã hàng',
  'ĐVT',
  'số lượng',
  'ghi chú',
  'tham chiếu',
  'mã nhân viên phụ trách',
  'Trạng thái',
] as const;

const COL_WIDTHS = [12, 16, 30, 20, 40, 16, 8, 14, 30, 16, 20, 16];

const QTY_COL = 7;
const NUMERIC_COLS: ReadonlyArray<NumericColumnFormat> = [[QTY_COL, FMT_QTY_PRICE]];

export const exportGoodsReceiptsToAccountingExcel = (
  receipts: ReadonlyArray<GoodsReceipt>,
  { employeeCodes, resolveStatusLabel }: GoodsReceiptAccountingExportOptions,
): void => {
  const dataRows: (string | number)[][] = [];
  for (const r of receipts) {
    const receivedDate = formatDate(r.receivedDate ?? r.createdAt);
    const staffCode = r.extra?.assignedTo ? (employeeCodes.get(r.extra.assignedTo) ?? '') : '';

    const statusLabel = resolveStatusLabel(r.status);

    for (const item of r.items ?? []) {
      dataRows.push([
        receivedDate,
        r.receiptNumber,
        r.vendorName,
        r.locationName,
        item.itemName,
        item.itemCode,
        item.unit,
        item.quantity ?? 0,
        item.note ?? '',
        r.reference,
        staffCode,
        statusLabel,
      ]);
    }
  }

  const worksheet = buildAccountingWorksheet({
    title: TITLE,
    periodLabel: resolveAccountingPeriodLabel(receipts.map((r) => r.receivedDate ?? r.createdAt)),
    headers: HEADERS,
    colWidths: COL_WIDTHS,
    dataRows,
    numericCols: NUMERIC_COLS,
  });

  writeAccountingWorkbook(worksheet, {
    sheetName: 'Mua hàng',
    fileNamePrefix: 'goods_receipts_accounting',
  });
};
