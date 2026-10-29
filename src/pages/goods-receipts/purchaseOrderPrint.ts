import type { CompanyInfo } from '@/config/companyInfo';
import type { GoodsReceipt, Product, Vendor } from '@/types';
import { isoToVnDateString } from '@/utils/dateTimeField';
import {
  buildSelfPrintingHtml,
  contentWidthMm,
  escapeHtml,
  openPrintWindow,
  type Orientation,
  type PaperSize,
  type SheetPalette,
} from '@/utils/printDocument';
import { purchaseOrderNamesOf } from '@/utils/productPurchaseOrderNames';
import { packageCountOf } from './goodsReceiptPackageCount';

export type PurchaseOrderPrintOptions = {
  paperSize: PaperSize;
  orientation: Orientation;

  includeExpectedDelivery: boolean;

  palette?: SheetPalette;
};

export const DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS: PurchaseOrderPrintOptions = {
  paperSize: 'A4',
  orientation: 'portrait',
  includeExpectedDelivery: false,
};

export type PurchaseOrderPrintLine = {
  code: string;

  name: string;

  nameZh: string;
  nameEn: string;

  unit: string;
  quantity: number;

  packageCount: number | null;

  photoUrl: string;
  note: string;
};

export type PurchaseOrderPrintData = {
  buyer: CompanyInfo;

  code: string;

  orderDate: string;

  expectedDate: string;
  supplier: {
    name: string;
    address: string;
    phone: string;
    contactPerson: string;
    email: string;
  };
  reference: string;
  lines: PurchaseOrderPrintLine[];
  showPhoto: boolean;
};

export function toPurchaseOrderPrintData(input: {
  receipt: GoodsReceipt;

  vendor: Vendor | undefined;
  buyer: CompanyInfo;
  unitLabelOf: (unit: string) => string;
  photoByCode: ReadonlyMap<string, string>;

  productByCode: ReadonlyMap<string, Product>;
  showPhoto: boolean;
}): PurchaseOrderPrintData {
  const { receipt, vendor, buyer, unitLabelOf, photoByCode, productByCode, showPhoto } = input;
  return {
    buyer,
    code: receipt.receiptNumber,
    orderDate: isoToVnDateString(receipt.createdAt) ?? '',
    expectedDate: isoToVnDateString(receipt.receivedDate) ?? '',
    supplier: {
      name: receipt.vendorName || vendor?.name || '',
      address: vendor?.address ?? '',
      phone: vendor?.phone ?? '',
      contactPerson: vendor?.contactPerson ?? '',
      email: vendor?.email ?? '',
    },
    reference: receipt.reference?.trim() ?? '',
    lines: receipt.items.map((it) => {
      const names = purchaseOrderNamesOf(productByCode.get(it.itemCode)?.extra);
      return {
        code: it.itemCode,
        name: it.itemName,
        nameZh: names.zh,
        nameEn: names.en,
        unit: unitLabelOf(it.unit),
        quantity: it.quantity,
        packageCount: packageCountOf(it),
        photoUrl: showPhoto ? (photoByCode.get(it.itemCode) ?? '') : '',
        note: it.note?.trim() ?? '',
      };
    }),
    showPhoto,
  };
}

type Tri = readonly [vi: string, zh: string, en: string];

const L = {
  title: ['ĐƠN ĐẶT HÀNG', '采购订单', 'PURCHASE ORDER'],
  number: ['Số', '编号', 'No.'],
  taxCode: ['Mã số thuế', '税号', 'Tax code'],
  tel: ['Điện thoại', '电话', 'Tel'],
  email: ['Email', '邮箱', 'Email'],
  supplier: ['Nhà cung cấp', '供应商', 'Supplier'],
  address: ['Địa chỉ', '地址', 'Address'],
  phone: ['Điện thoại', '电话', 'Phone'],
  contact: ['Người liên hệ', '联系人', 'Contact'],
  reference: ['Tham chiếu', '参考号', 'Reference'],
  expectedDelivery: ['Ngày giao dự kiến', '预计交货日期', 'Expected delivery'],
  colNo: ['STT', '序号', 'No.'],
  colCode: ['Mã hàng', '货号', 'Item code'],
  colPhoto: ['Hình ảnh', '图片', 'Photo'],
  colName: ['Tên hàng', '品名', 'Description'],
  colUnit: ['ĐVT', '单位', 'Unit'],
  colQty: ['Số lượng', '数量', 'Qty'],
  colPackages: ['Số kiện', '件数', 'Packages'],
} as const satisfies Record<string, Tri>;

const ZH_FONTS = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC"';

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function inline([vi, zh, en]: Tri): string {
  const enPart = en === vi ? '' : ` / <span lang="en">${escapeHtml(en)}</span>`;
  return `${escapeHtml(vi)}<span class="alt"> / <span class="zh" lang="zh-Hans">${escapeHtml(zh)}</span>${enPart}</span>`;
}

function stacked([vi, zh, en]: Tri): string {
  return `<div class="vi">${escapeHtml(vi)}</div><div class="zh" lang="zh-Hans">${escapeHtml(zh)}</div><div class="en" lang="en">${escapeHtml(en)}</div>`;
}

function dateLine(ymd: string): string {
  const [y = 0, m = 0, d = 0] = ymd.split('-').map(Number);
  if (!y || !m || !d) return '';
  const vi = `Ngày ${String(d).padStart(2, '0')} tháng ${m} năm ${y}`;
  const zh = `${y}年${m}月${d}日`;
  const en = `${d} ${EN_MONTHS[m - 1] ?? ''} ${y}`;
  return `${vi} &nbsp;·&nbsp; <span class="zh" lang="zh-Hans">${zh}</span> &nbsp;·&nbsp; <span lang="en">${en}</span>`;
}

function quantity(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function paletteCss(p: SheetPalette): string {
  return `
  .header { border-bottom-color: ${p.accent}; }
  .buyer-name, .title h1 { color: ${p.accent}; }
  table.party {
    border-collapse: separate; border-spacing: 0; padding: 6px 10px;
    background: ${p.panel}; border: 1px solid ${p.panelBorder}; border-radius: 6px;
  }
  table.items th, table.items td { border-color: ${p.grid}; }
  table.items thead th { background: ${p.accent}; border-color: ${p.accent}; color: #fff; }
  table.items thead th .zh, table.items thead th .en { color: rgba(255, 255, 255, 0.85); }
  table.items tbody tr:nth-child(even) td { background: ${p.stripe}; }
  td.photo img { border-color: ${p.panelBorder}; }
`;
}

function buildParts(
  data: PurchaseOrderPrintData,
  options: PurchaseOrderPrintOptions,
): { css: string; docHtml: string } {
  const { buyer, supplier, showPhoto } = data;
  const { paperSize, orientation, includeExpectedDelivery, palette } = options;

  const showPackages = data.lines.some((l) => l.packageCount !== null);

  const isA5 = paperSize === 'A5';
  const marginMm = isA5 ? 8 : 12;
  const baseFontPx = isA5 ? 10 : 12.5;
  const subFontPx = isA5 ? 8 : 10;
  const photoPx = isA5 ? 96 : 144;
  const cellPadPx = isA5 ? 4 : 6;
  const w = isA5
    ? { no: 24, code: 50, photo: photoPx + 8, unit: 40, qty: 56, packages: 46 }
    : { no: 34, code: 64, photo: photoPx + 8, unit: 56, qty: 80, packages: 64 };
  const widthMm = contentWidthMm(paperSize, orientation, marginMm);

  const buyerContacts = [
    buyer.taxCode && `${inline(L.taxCode)}: ${escapeHtml(buyer.taxCode)}`,
    buyer.tel && `${inline(L.tel)}: ${escapeHtml(buyer.tel)}`,
    buyer.email && `${inline(L.email)}: ${escapeHtml(buyer.email)}`,
  ].filter(Boolean);

  const expected = includeExpectedDelivery ? dateLine(data.expectedDate) : '';
  const partyRows = (
    [
      [L.supplier, escapeHtml(supplier.name), true],
      [L.address, escapeHtml(supplier.address), false],
      [L.phone, escapeHtml(supplier.phone), false],
      [L.contact, escapeHtml(supplier.contactPerson), false],
      [L.email, escapeHtml(supplier.email), false],
      [L.reference, escapeHtml(data.reference), false],
      [L.expectedDelivery, expected, false],
    ] as const
  )
    .filter(([, html, always]) => always || html)
    .map(
      ([label, html, strong]) =>
        `<tr><th>${inline(label)}</th><td${strong ? ' class="strong"' : ''}>${html}</td></tr>`,
    )
    .join('');

  const rows = data.lines
    .map(
      (line, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td class="code">${escapeHtml(line.code)}</td>
          ${
            showPhoto
              ? `<td class="c photo">${line.photoUrl ? `<img src="${escapeHtml(line.photoUrl)}" alt="" />` : ''}</td>`
              : ''
          }
          <td class="name">${escapeHtml(line.name)}${
            line.nameZh
              ? `<div class="name-zh zh" lang="zh-Hans">${escapeHtml(line.nameZh)}</div>`
              : ''
          }${line.nameEn ? `<div class="name-en" lang="en">${escapeHtml(line.nameEn)}</div>` : ''}${
            line.note ? `<div class="note">${escapeHtml(line.note)}</div>` : ''
          }</td>
          <td class="c">${escapeHtml(line.unit)}</td>
          <td class="r">${quantity(line.quantity)}</td>${
            showPackages
              ? `
          <td class="r packages">${line.packageCount === null ? '' : quantity(line.packageCount)}</td>`
              : ''
          }
        </tr>`,
    )
    .join('');

  const css = `
  @page { size: ${paperSize} ${orientation}; margin: ${marginMm}mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, ${ZH_FONTS}, sans-serif;
    font-size: ${baseFontPx}px; color: #1f2937; margin: 0; line-height: 1.4;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .zh { font-family: ${ZH_FONTS}, sans-serif; }
  .alt { color: #6b7280; font-weight: 400; }
  .doc { max-width: ${widthMm}mm; margin: 0 auto; }

  .header { border-bottom: 2px solid #1f2937; padding-bottom: 8px; }
  .buyer-name { font-weight: 700; font-size: ${baseFontPx + 3}px; text-transform: uppercase; }
  .buyer-line { margin-top: 3px; color: #374151; }

  .title { text-align: center; margin: 14px 0 12px; }
  .title h1 { font-size: ${isA5 ? 20 : 24}px; font-weight: 700; margin: 0; letter-spacing: 1px; }
  .title .alt-title { font-size: ${baseFontPx + 2}px; font-weight: 600; color: #374151; margin-top: 2px; }
  .title .meta { margin-top: 4px; color: #374151; }
  .title .no b { font-weight: 700; color: #1f2937; }

  table { width: 100%; border-collapse: collapse; }
  table.party { margin-bottom: 12px; }
  table.party th, table.party td { border: 0; padding: 2px 8px 2px 0; text-align: left; vertical-align: top; }
  table.party th { white-space: nowrap; font-weight: 400; color: #4b5563; width: 1%; }
  table.party td.strong { font-weight: 700; }

  table.items th, table.items td { border: 1px solid #d1d5db; padding: ${cellPadPx}px; vertical-align: middle; }
  table.items thead th { background: #f3f4f6; text-align: center; line-height: 1.25; }
  table.items thead th .vi { font-weight: 700; }
  table.items thead th .zh, table.items thead th .en { font-weight: 400; font-size: ${subFontPx}px; color: #4b5563; }
  td.c { text-align: center; }
  td.r { text-align: right; white-space: nowrap; }
  td.code { overflow-wrap: anywhere; }
  td.name .name-zh, td.name .name-en { margin-top: 1px; }
  td.name .note { margin-top: 2px; font-style: italic; font-size: ${subFontPx}px; color: #6b7280; }
  td.photo { padding: 3px; }
  td.photo img {
    display: block; width: ${photoPx}px; height: ${photoPx}px; object-fit: contain;
    margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 4px; background: #fff;
  }
  thead { display: table-header-group; }
  tbody tr { page-break-inside: avoid; }
${palette ? paletteCss(palette) : ''}`;

  const docHtml = `  <div class="doc">
    <div class="header">
      <div class="buyer-name">${escapeHtml(buyer.name)}</div>
      ${buyer.address ? `<div class="buyer-line">${escapeHtml(buyer.address)}</div>` : ''}
      ${buyerContacts.length ? `<div class="buyer-line">${buyerContacts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
    </div>

    <div class="title">
      <h1>${escapeHtml(L.title[0])}</h1>
      <div class="alt-title"><span class="zh" lang="zh-Hans">${escapeHtml(L.title[1])}</span> &nbsp;·&nbsp; <span lang="en">${escapeHtml(L.title[2])}</span></div>
      <div class="meta">${dateLine(data.orderDate)}</div>
      <div class="meta no">${inline(L.number)}: <b>${escapeHtml(data.code)}</b></div>
    </div>

    <table class="party"><tbody>${partyRows}</tbody></table>

    <table class="items">
      <thead>
        <tr>
          <th style="width:${w.no}px">${stacked(L.colNo)}</th>
          <th style="width:${w.code}px">${stacked(L.colCode)}</th>
          ${showPhoto ? `<th style="width:${w.photo}px">${stacked(L.colPhoto)}</th>` : ''}
          <th>${stacked(L.colName)}</th>
          <th style="width:${w.unit}px">${stacked(L.colUnit)}</th>
          <th style="width:${w.qty}px">${stacked(L.colQty)}</th>
          ${showPackages ? `<th style="width:${w.packages}px">${stacked(L.colPackages)}</th>` : ''}
        </tr>
      </thead>
      <tbody>${rows}
      </tbody>
    </table>
  </div>`;

  return { css, docHtml };
}

export function buildPurchaseOrderHtml(
  data: PurchaseOrderPrintData,
  options: PurchaseOrderPrintOptions = DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS,
): string {
  const { css, docHtml } = buildParts(data, options);
  return buildSelfPrintingHtml({
    title: `${L.title[0]} ${data.code}`,
    css,
    bodyHtml: docHtml,
  });
}

export function printPurchaseOrder(
  data: PurchaseOrderPrintData,
  options: PurchaseOrderPrintOptions = DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS,
): boolean {
  return openPrintWindow(buildPurchaseOrderHtml(data, options));
}
