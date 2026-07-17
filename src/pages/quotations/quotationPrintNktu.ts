

import {
  buildSelfPrintingHtml,
  contentWidthMm,
  escapeHtml,
  formatVndMoney as money,
  openPrintWindow,
} from '@/utils/printDocument';
import {
  DEFAULT_QUOTATION_PRINT_OPTIONS,
  type QuotationPrintData,
  type QuotationPrintOptions,
} from './quotationPrint';

const DOC_TITLE = 'BÁO GIÁ';
const ACCENT = '#dd7a2e';

function decimal2(n: number): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildParts(
  data: QuotationPrintData,
  options: QuotationPrintOptions,
): { css: string; docHtml: string } {
  const { seller, customer } = data;
  const { paperSize, orientation } = options;
  const showPhoto = data.showPhoto ?? false;
  const showVat = data.showVat ?? true;

  
  const isA5 = paperSize === 'A5';
  const marginMm = isA5 ? 8 : 12;
  const verticalMarginMm = isA5 ? 8 : 12;
  const baseFontPx = isA5 ? 10 : 12.5;
  const photoPx = isA5 ? 44 : 56;
  const widthMm = contentWidthMm(paperSize, orientation, marginMm);

  
  const labelSpan = showPhoto ? 6 : 5;

  const rows = data.lines
    .map(
      (line, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          ${
            showPhoto
              ? `<td class="c photo">${line.photoUrl ? `<img src="${escapeHtml(line.photoUrl)}" alt="" />` : ''}</td>`
              : ''
          }
          <td class="name">${escapeHtml(line.name)}</td>
          <td class="c">${escapeHtml(line.unit)}</td>
          <td class="r">${decimal2(line.quantity)}</td>
          <td class="r">${decimal2(line.unitPrice)}</td>
          <td class="r">${money(line.lineTotal)}</td>
        </tr>`,
    )
    .join('');

  
  
  
  
  const vatSummaryRows = showVat
    ? `
        <tr class="sum">
          <td class="r" colspan="${labelSpan}">Cộng tiền hàng</td>
          <td class="r">${money(data.subtotal)}</td>
        </tr>
        <tr class="sum">
          <td class="r" colspan="${labelSpan}">Tiền thuế (${Math.round(data.vatPercent)}%)</td>
          <td class="r">${money(data.vatAmount)}</td>
        </tr>`
    : '';
  const summaryRows = `${vatSummaryRows}
        <tr class="grand">
          <td class="r" colspan="${labelSpan}">Tổng tiền thanh toán</td>
          <td class="r">${money(data.grandTotal)}</td>
        </tr>`;

  const css = `
  @page { size: ${paperSize} ${orientation}; margin: ${verticalMarginMm}mm ${marginMm}mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: ${baseFontPx}px; color: #202020; margin: 0; line-height: 1.4;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .doc { max-width: ${widthMm}mm; margin: 0 auto; }

  .header { border-bottom: 2px solid ${ACCENT}; padding-bottom: 8px; }
  .seller-name { font-weight: 700; font-size: 16px; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.3px; }
  .seller-line { margin-top: 3px; color: #4b5563; }

  .title { text-align: center; margin: 16px 0 12px; }
  .title h1 { font-size: 26px; font-weight: 700; margin: 0; color: ${ACCENT}; letter-spacing: 1px; }
  .title .meta { margin-top: 4px; color: #374151; }
  .title .meta .date { font-style: italic; }
  .title .meta .no { font-weight: 700; }

  .cust {
    background: #fdf6ef; border: 1px solid #f0e2d4; border-radius: 6px;
    padding: 10px 14px; margin-bottom: 12px;
  }
  .cust .row { display: flex; gap: 6px; margin-bottom: 3px; }
  .cust .row:last-child { margin-bottom: 0; }
  .cust .lbl { white-space: nowrap; color: #6b7280; min-width: 96px; }
  .cust .val { font-weight: 600; }
  .cust .note { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ecd9c6; }
  .cust .note .val { font-weight: 400; font-style: italic; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #eaddcf; padding: 6px 8px; vertical-align: middle; }
  thead th {
    background: ${ACCENT}; color: #fff; font-weight: 600; text-align: center;
    border-color: ${ACCENT};
  }
  td.c { text-align: center; }
  td.r { text-align: right; }
  td.name { font-weight: 500; }
  td.photo { padding: 3px; width: ${photoPx + 8}px; }
  td.photo img {
    display: block; width: ${photoPx}px; height: ${photoPx}px; object-fit: contain;
    margin: 0 auto; border: 1px solid #f0e2d4; border-radius: 4px; background: #fff;
  }
  tbody tr { page-break-inside: avoid; }
  tbody tr:nth-child(even of :not(.sum):not(.grand)) td { background: #fdfaf6; }
  tr.sum td { font-weight: 600; background: #fdf6ef; }
  tr.grand td {
    font-weight: 700; font-size: ${baseFontPx + 1}px; color: ${ACCENT};
    background: #fbeede; border-color: #eccfae;
  }
  thead { display: table-header-group; }

  .words { margin-top: 10px; font-style: italic; color: #374151; }
  .words b { font-style: normal; color: #202020; }

  .signs { display: flex; margin-top: 28px; text-align: center; gap: 24px; }
  .signs > div { flex: 1; }
  .signs .role { font-weight: 700; color: ${ACCENT}; }
  .signs .hint { font-style: italic; font-size: 11px; color: #6b7280; margin-top: 2px; }
`;

  const photoHead = showPhoto ? `<th style="width:${photoPx + 8}px">Hình ảnh</th>` : '';
  const noteRow = data.note
    ? `<div class="row note"><span class="lbl">Diễn giải</span><span class="val">${escapeHtml(data.note)}</span></div>`
    : '';

  const docHtml = `  <div class="doc">
    <div class="header">
      <div class="seller-name">${escapeHtml(seller.name)}</div>
      <div class="seller-line">${escapeHtml(seller.address)}</div>
      <div class="seller-line">Mã số thuế: ${escapeHtml(seller.taxCode)} &nbsp;·&nbsp; Tel: ${escapeHtml(seller.tel)}</div>
      <div class="seller-line">Email: ${escapeHtml(seller.email)}</div>
    </div>

    <div class="title">
      <h1>${escapeHtml(DOC_TITLE)}</h1>
      <div class="meta">
        <span class="date">${escapeHtml(data.dateText)}</span> &nbsp;·&nbsp; <span class="no">Số: ${escapeHtml(data.code)}</span>
      </div>
    </div>

    <div class="cust">
      <div class="row"><span class="lbl">Khách hàng</span><span class="val">${escapeHtml(customer.name || '')}</span></div>
      <div class="row"><span class="lbl">Địa chỉ</span><span class="val" style="font-weight:400">${escapeHtml(customer.address || '')}</span></div>
      <div class="row"><span class="lbl">Mã số thuế</span><span class="val" style="font-weight:400">${escapeHtml(customer.taxCode || '')}</span></div>
      <div class="row"><span class="lbl">SĐT</span><span class="val" style="font-weight:400">${escapeHtml(customer.phone || '')}</span></div>
      ${noteRow}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">STT</th>
          ${photoHead}
          <th>Tên hàng</th>
          <th style="width:56px">ĐVT</th>
          <th style="width:80px">Số lượng</th>
          <th style="width:96px">Đơn giá</th>
          <th style="width:112px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${rows}${summaryRows}
      </tbody>
    </table>

    <div class="words">Số tiền viết bằng chữ: <b>${escapeHtml(data.amountInWords)}</b></div>

    <div class="signs">
      <div>
        <div class="role">Xác nhận của khách hàng</div>
        <div class="hint">(Ký, họ tên)</div>
      </div>
      <div>
        <div class="role">Đại diện bên bán</div>
        <div class="hint">(Ký, họ tên, đóng dấu)</div>
      </div>
    </div>
  </div>`;

  return { css, docHtml };
}

export function buildNktuQuotationHtml(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): string {
  const { css, docHtml } = buildParts(data, options);
  return buildSelfPrintingHtml({
    title: `${DOC_TITLE} ${data.code}`,
    css,
    bodyHtml: docHtml,
  });
}

export function printNktuQuotation(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): boolean {
  return openPrintWindow(buildNktuQuotationHtml(data, options));
}
