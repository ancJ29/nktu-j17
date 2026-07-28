import * as XLSX from 'xlsx-js-style';
import { DEFAULT_PRINT_OPTIONS } from './salesOrderDeliveryNote';
import type { DeliveryNoteData, DeliveryNotePrintOptions } from './salesOrderDeliveryNote';

type CellValue = string | number;

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'E8E8E8' } } as const;
const TOTAL_FILL = { fgColor: { rgb: 'F2F2F2' } } as const;

const FMT_MONEY = '#,##0';

const FMT_QTY = '#,##0.##';

function paymentLabel(state: DeliveryNoteData['payment']['state']): string {
  if (state === 'partial') return 'Thanh toán 1 phần';
  if (state === 'paid') return 'Đã thanh toán';
  return '';
}

export function buildDeliveryNoteWorkbook(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): XLSX.WorkBook {
  const { includePrice } = options;
  const colCount = includePrice ? 6 : 4;
  const lastCol = colCount - 1;

  const aoa: CellValue[][] = [];
  const merges: XLSX.Range[] = [];

  const banner = (text: string): number => {
    const r = aoa.length;
    const row: CellValue[] = new Array(colCount).fill('');
    row[0] = text;
    aoa.push(row);
    merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });
    return r;
  };
  const blank = () => aoa.push([]);

  const rSellerName = banner(data.seller.name);
  banner(data.seller.address);
  banner(`Mã số thuế: ${data.seller.taxCode} - Tel: ${data.seller.tel}`);
  banner(`Email: ${data.seller.email}`);
  blank();

  const rTitle = banner('PHIẾU GIAO HÀNG');
  const rDate = banner(data.dateText);
  const rNo = banner(`Số: ${data.orderNumber}`);
  blank();

  const rCustomerName = banner(`Tên khách hàng: ${data.customer.name || ''}`);
  banner(`Địa chỉ: ${data.customer.address || ''}`);
  banner(`Mã số thuế: ${data.customer.taxCode || ''}`);
  banner(`SĐT: ${data.customer.phone || ''}`);
  banner(`Số PO: ${data.customerPONumber || ''}`);
  if (includePrice) banner(`Thanh toán: ${paymentLabel(data.payment.state)}`);
  blank();

  const rHeader = aoa.length;
  aoa.push(
    includePrice
      ? ['STT', 'Tên hàng', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền']
      : ['STT', 'Tên hàng', 'Đơn vị', 'Số lượng'],
  );
  const rFirstItem = aoa.length;
  data.lines.forEach((line, i) => {
    aoa.push(
      includePrice
        ? [i + 1, line.name, line.unit, line.quantity, line.unitPrice, line.lineTotal]
        : [i + 1, line.name, line.unit, line.quantity],
    );
  });
  const rLastItem = aoa.length - 1;

  let rFirstTotal = -1;
  let rGrandTotal = -1;
  if (includePrice) {
    const summary = (label: string, value: number): number => {
      const r = aoa.length;
      const row: CellValue[] = new Array(colCount).fill('');
      row[0] = label;
      row[lastCol] = value;
      aoa.push(row);
      merges.push({ s: { r, c: 0 }, e: { r, c: lastCol - 1 } });
      return r;
    };
    rFirstTotal = summary('Cộng tiền hàng:', data.subtotal);
    summary(`Tiền thuế (${Math.round(data.vatPercent)}%):`, data.vatAmount);
    if (data.shippingFee > 0) summary('Phí vận chuyển:', data.shippingFee);
    rGrandTotal = summary('Tổng tiền thanh toán:', data.grandTotal);
    blank();
    banner(`Số tiền viết bằng chữ: ${data.amountInWords}`);
  }

  blank();
  const rSign = aoa.length;
  aoa.push(
    includePrice
      ? ['Người nhận', '', 'Người giao', '', 'Người lập phiếu', '']
      : ['Người nhận', '', 'Người giao', 'Người lập phiếu'],
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  ws['!cols'] = includePrice
    ? [{ wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }]
    : [{ wch: 14 }, { wch: 44 }, { wch: 12 }, { wch: 12 }];

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = (ws[ref] ?? (ws[ref] = { t: 's', v: '' })) as StyledCell;
    cell.s = { ...(cell.s ?? {}), ...style };
  };
  const setFmt = (r: number, c: number, z: string) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (ws[ref]) (ws[ref] as XLSX.CellObject).z = z;
  };
  const rowBorders = (r: number) => {
    for (let c = 0; c <= lastCol; c++) setStyle(r, c, { border: ALL_BORDERS });
  };

  setStyle(rSellerName, 0, { font: { bold: true, sz: 14 } });
  setStyle(rTitle, 0, { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } });
  setStyle(rDate, 0, { font: { italic: true }, alignment: { horizontal: 'center' } });
  setStyle(rNo, 0, { alignment: { horizontal: 'center' } });
  setStyle(rCustomerName, 0, { font: { bold: true } });

  for (let c = 0; c <= lastCol; c++) {
    setStyle(rHeader, c, {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: HEADER_FILL,
      border: ALL_BORDERS,
    });
  }

  for (let r = rFirstItem; r <= rLastItem; r++) {
    rowBorders(r);
    setStyle(r, 0, { alignment: { horizontal: 'center' } });
    setStyle(r, 2, { alignment: { horizontal: 'center' } });
    setStyle(r, 3, { alignment: { horizontal: 'right' } });
    setFmt(r, 3, FMT_QTY);
    if (includePrice) {
      setStyle(r, 4, { alignment: { horizontal: 'right' } });
      setStyle(r, 5, { alignment: { horizontal: 'right' } });
      setFmt(r, 4, FMT_MONEY);
      setFmt(r, 5, FMT_MONEY);
    }
  }

  if (rFirstTotal >= 0) {
    for (let r = rFirstTotal; r <= rGrandTotal; r++) {
      rowBorders(r);
      setStyle(r, 0, { font: { bold: true }, alignment: { horizontal: 'right' } });
      setStyle(r, lastCol, { font: { bold: true }, alignment: { horizontal: 'right' } });
      setFmt(r, lastCol, FMT_MONEY);
    }
    setStyle(rGrandTotal, 0, { fill: TOTAL_FILL });
    setStyle(rGrandTotal, lastCol, { fill: TOTAL_FILL });
  }

  for (let c = 0; c <= lastCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: rSign, c });
    const cell = ws[ref] as XLSX.CellObject | undefined;
    if (cell && cell.v !== '') {
      setStyle(rSign, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PHIẾU GIAO HÀNG');
  return wb;
}

export function exportSalesOrderDeliveryNoteToExcel(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions,
  fileName: string,
): void {
  XLSX.writeFile(buildDeliveryNoteWorkbook(data, options), fileName);
}
