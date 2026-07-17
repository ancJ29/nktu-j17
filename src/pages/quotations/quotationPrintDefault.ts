

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
  const baseFontPx = isA5 ? 10 : 12.5;
  const photoPx = isA5 ? 42 : 52;
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
          <td>${escapeHtml(line.name)}</td>
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
  @page { size: ${paperSize} ${orientation}; margin: ${marginMm}mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: ${baseFontPx}px; color: #1a1a1a; margin: 0; line-height: 1.4;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .doc { max-width: ${widthMm}mm; margin: 0 auto; }

  .header { border-bottom: 1.5px solid #1a1a1a; padding-bottom: 6px; }
  .seller-name { font-weight: 700; font-size: 15px; text-transform: uppercase; }
  .seller-line { margin-top: 2px; color: #444; }

  .title { text-align: center; margin: 14px 0 10px; }
  .title h1 { font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 1px; }
  .title .meta { margin-top: 3px; color: #333; }
  .title .meta .date { font-style: italic; }
  .title .meta .no { font-weight: 700; }

  .cust { margin-bottom: 10px; }
  .cust .row { display: flex; gap: 6px; margin-bottom: 2px; }
  .cust .lbl { white-space: nowrap; color: #555; min-width: 90px; }
  .cust .val { font-weight: 600; }
  .cust .note { margin-top: 5px; }
  .cust .note .val { font-weight: 400; font-style: italic; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #999; padding: 5px 7px; vertical-align: middle; }
  thead th { background: #f0f0f0; font-weight: 600; text-align: center; }
  td.c { text-align: center; }
  td.r { text-align: right; }
  td.photo { padding: 3px; width: ${photoPx + 8}px; }
  td.photo img {
    display: block; width: ${photoPx}px; height: ${photoPx}px; object-fit: contain;
    margin: 0 auto;
  }
  tbody tr { page-break-inside: avoid; }
  tr.sum td { font-weight: 600; }
  tr.grand td { font-weight: 700; font-size: ${baseFontPx + 1}px; background: #f0f0f0; }
  thead { display: table-header-group; }

  .words { margin-top: 8px; font-style: italic; color: #333; }
  .words b { font-style: normal; color: #1a1a1a; }

  .signs { display: flex; margin-top: 26px; text-align: center; gap: 24px; }
  .signs > div { flex: 1; }
  .signs .role { font-weight: 700; }
  .signs .hint { font-style: italic; font-size: 11px; color: #666; margin-top: 2px; }
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

export function buildDefaultQuotationHtml(
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

export function printDefaultQuotation(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): boolean {
  return openPrintWindow(buildDefaultQuotationHtml(data, options));
}
