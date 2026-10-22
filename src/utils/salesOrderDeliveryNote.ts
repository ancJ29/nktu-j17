import type { CompanyInfo } from '@/config/companyInfo';
import type { SalesOrderPayment } from './salesOrderPricing';

export type DeliveryNotePaperSize = 'A4' | 'A5';

export type DeliveryNoteOrientation = 'portrait' | 'landscape';

export type DeliveryNotePrintOptions = {
  paperSize: DeliveryNotePaperSize;
  orientation: DeliveryNoteOrientation;

  includePrice: boolean;
};

export const DEFAULT_PRINT_OPTIONS: DeliveryNotePrintOptions = {
  paperSize: 'A4',
  orientation: 'portrait',
  includePrice: true,
};

export type DeliveryNoteLine = {
  name: string;

  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type DeliveryNoteData = {
  seller: CompanyInfo;

  orderNumber: string;

  dateText: string;
  customer: {
    name: string;
    address: string;
    taxCode: string;
    phone: string;
  };

  customerPONumber: string;
  payment: SalesOrderPayment;
  lines: DeliveryNoteLine[];

  subtotal: number;

  vatPercent: number;

  vatAmount: number;

  shippingFee: number;

  grandTotal: number;

  amountInWords: string;

  note?: string;
};

function money(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

function decimal2(n: number): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PAPER_MM: Record<DeliveryNotePaperSize, readonly [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
};

export type DeliveryNoteParts = {
  css: string;
  docHtml: string;
  contentWidthMm: number;
};

export function buildDeliveryNoteParts(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): DeliveryNoteParts {
  const { seller, customer } = data;
  const { paperSize, orientation, includePrice } = options;
  const docTitle = 'PHIẾU GIAO HÀNG';

  const isA5 = paperSize === 'A5';
  const marginMm = isA5 ? 10 : 12;
  const verticalMarginMm = isA5 ? 10 : 14;
  const baseFontPx = isA5 ? 11 : 13;

  const [shortSide, longSide] = PAPER_MM[paperSize];
  const pageWidthMm = orientation === 'landscape' ? longSide : shortSide;
  const contentWidthMm = pageWidthMm - marginMm * 2;

  const rows = data.lines
    .map(
      (line, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(line.name)}</td>
          <td class="c">${escapeHtml(line.unit)}</td>
          <td class="r">${decimal2(line.quantity)}</td>
          ${
            includePrice
              ? `<td class="r">${decimal2(line.unitPrice)}</td>
          <td class="r">${money(line.lineTotal)}</td>`
              : ''
          }
        </tr>`,
    )
    .join('');

  const shippingRow =
    includePrice && data.shippingFee > 0
      ? `
        <tr class="sum">
          <td class="r" colspan="5">Phí vận chuyển:</td>
          <td class="r">${money(data.shippingFee)}</td>
        </tr>`
      : '';

  const paymentContent = !includePrice
    ? ''
    : data.payment.state === 'partial'
      ? `Thanh toán 1 phần`
      : data.payment.state === 'paid'
        ? 'Đã thanh toán'
        : '';

  const summaryRows = includePrice
    ? `
        <tr class="sum">
          <td class="r" colspan="5">Cộng tiền hàng:</td>
          <td class="r">${money(data.subtotal)}</td>
        </tr>
        <tr class="sum">
          <td class="r" colspan="5">Tiền thuế (${Math.round(data.vatPercent)}%):</td>
          <td class="r">${money(data.vatAmount)}</td>
        </tr>${shippingRow}
        <tr class="sum">
          <td class="r" colspan="5">Tổng tiền thanh toán:</td>
          <td class="r">${money(data.grandTotal)}</td>
        </tr>`
    : '';

  const css = `
  @page { size: ${paperSize} ${orientation}; margin: ${verticalMarginMm}mm ${marginMm}mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: ${baseFontPx}px; color: #000; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .doc {
    max-width: ${contentWidthMm}mm; margin: 0 auto;
    font-family: "Times New Roman", Times, serif;
    font-size: ${baseFontPx}px; color: #000;
  }
  .seller-name { font-weight: bold; font-size: 15px; text-transform: uppercase; }
  .seller-line { margin-top: 2px; }
  .title { text-align: center; margin: 14px 0 2px; }
  .title h1 { font-size: 22px; font-weight: bold; margin: 0; letter-spacing: 0.5px; }
  .title .date { font-style: italic; font-weight: bold; margin-top: 2px; }
  .title .no { margin-top: 2px; }
  .cust { margin: 10px 0 8px; }
  .cust .cols { display: flex; gap: 24px; align-items: flex-start; }
  .cust .col-main { flex: 1; }
  .cust .col-side { flex: 0 0 38%; }
  .cust .lbl { white-space: nowrap; }
  .cust b { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  th { text-align: center; font-weight: bold; }
  td.c { text-align: center; }
  td.r { text-align: right; }
  tr { page-break-inside: avoid; }
  tr.sum td { font-weight: bold; }
  thead { display: table-header-group; }
  .words { margin-top: 8px; font-style: italic; }
  .words b { font-style: normal; }
  .signs { display: flex; margin-top: 26px; text-align: center; }
  .signs > div { flex: 1; }
  .signs .role { font-weight: bold; }
  .signs .hint { font-style: italic; font-size: 12px; }
`;

  const docHtml = `  <div class="doc">
    <div class="seller-name" style="margin-bottom: 5px;">${escapeHtml(seller.name)}</div>
    <div class="seller-line" style="margin-bottom: 5px;">${escapeHtml(seller.address)}</div>
    <div class="seller-line" style="margin-bottom: 5px;">Mã số thuế: ${escapeHtml(seller.taxCode)} - Tel: ${escapeHtml(seller.tel)}</div>
    <div class="seller-line" style="margin-bottom: 5px;">Email: ${escapeHtml(seller.email)}</div>

    <div class="title">
      <h1 style="margin-bottom: 10px;">${escapeHtml(docTitle)}</h1>
      <div class="date" style="margin-bottom: 5px;">${escapeHtml(data.dateText)}</div>
      <div class="no" style="margin-bottom: 5px;">Số: ${escapeHtml(data.orderNumber)}</div>
    </div>

    <div class="cust">
      <div class="cols">
        <div class="col-main">
          <div style="margin-bottom: 5px;"><span class="lbl">Tên khách hàng:</span> <b>${escapeHtml(customer.name || '')}</b></div>
          <div style="margin-bottom: 5px;"><span class="lbl">Địa chỉ:</span> ${escapeHtml(customer.address || '')}</div>
          <div style="margin-bottom: 5px;"><span class="lbl">Mã số thuế:</span> ${escapeHtml(customer.taxCode || '')}</div>
          <div style="margin-bottom: 5px;"><span class="lbl">SĐT:</span> ${escapeHtml(customer.phone || '')}</div>
        </div>
        <div class="col-side">
          <div style="margin-bottom: 5px;"><span class="lbl">Số PO:</span> ${escapeHtml(data.customerPONumber || '')}</div>
          <div style="margin-bottom: 5px;"><span class="lbl">Thanh toán:</span> ${escapeHtml(paymentContent || '')}</div>
        </div>
      </div>
      ${data.note ? `<div style="margin-bottom: 5px;"><span class="lbl">Diễn giải:</span> ${escapeHtml(data.note || '')}</div>` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:36px">STT</th>
          <th>Tên hàng</th>
          <th style="width:60px">Đơn vị</th>
          <th style="width:90px">Số lượng</th>
          ${
            includePrice
              ? `<th style="width:100px">Đơn giá</th>
          <th style="width:120px">Thành tiền</th>`
              : ''
          }
        </tr>
      </thead>
      <tbody>${rows}${summaryRows}
      </tbody>
    </table>

    ${includePrice ? `<div class="words">Số tiền viết bằng chữ: <b>${escapeHtml(data.amountInWords)}</b></div>` : ''}

    <div class="signs">
      <div>
        <div class="role">Người nhận</div>
        <div class="hint">(Ký, họ tên)</div>
      </div>
      <div>
        <div class="role">Người giao</div>
        <div class="hint">(Ký, họ tên)</div>
      </div>
      <div>
        <div class="role">Người lập phiếu</div>
        <div class="hint">(Ký, họ tên, đóng dấu)</div>
      </div>
    </div>
  </div>`;

  return { css, docHtml, contentWidthMm };
}

const PRINT_SCRIPT = `  <script>
    window.addEventListener('load', function () {
      window.focus();
      window.print();
    });
    window.onafterprint = function () { window.close(); };
  </script>
`;

function buildDoc(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions,
  bodyTail: string,
): string {
  const { css, docHtml } = buildDeliveryNoteParts(data, options);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>PHIẾU GIAO HÀNG ${escapeHtml(data.orderNumber)}</title>
<style>${css}</style>
</head>
<body>
${docHtml}
${bodyTail}</body>
</html>`;
}

export function buildDeliveryNoteHtml(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): string {
  return buildDoc(data, options, PRINT_SCRIPT);
}

export function buildDeliveryNoteStaticHtml(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): string {
  return buildDoc(data, options, '');
}

export function printSalesOrderDeliveryNote(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;
  win.document.open();
  win.document.write(buildDeliveryNoteHtml(data, options));
  win.document.close();
  return true;
}
