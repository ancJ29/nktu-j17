import type { SalesOrderItem } from '@/types';

export type ProductLabelSize = 'small' | 'A7';
export type ProductLabelTemplate = 'template1' | 'template2';

export const PRODUCT_LABEL_SIZES: Record<ProductLabelSize, { widthIn: number; heightIn: number }> =
  {
    small: { widthIn: 3.15, heightIn: 1.97 },
    A7: { widthIn: 4.08, heightIn: 2.89 },
  };

const PRODUCT_LABEL_INSET: Record<ProductLabelSize, string> = {
  small: '4.8mm 6.2mm 5.3mm 3.7mm',
  A7: '0.08in',
};

export function formatProductLabelPaperSize(size: ProductLabelSize): string {
  const { widthIn, heightIn } = PRODUCT_LABEL_SIZES[size];
  return `${heightIn}" × ${widthIn}"`;
}

export type ProductLabelFields = {
  lineNo: number;
  date: string;
  header: string;
  productCode: string;
  productName: string;
  color: string;
  dimensions: string;

  quantity: string;

  packageCount: number;
  weight: string;
  customerPONumber: string;
};

export type ProductLabelEditableField = Exclude<keyof ProductLabelFields, 'lineNo'>;

export const EMPTY_PRODUCT_LABEL_FIELDS: ProductLabelFields = {
  lineNo: 0,
  date: '',
  header: '',
  productCode: '',
  productName: '',
  color: '',
  dimensions: '',
  quantity: '',
  packageCount: 1,
  weight: '',
  customerPONumber: '',
};

export function formatProductLabelDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function buildDefaultProductLabelFields(input: {
  line?: { item: Pick<SalesOrderItem, 'productName' | 'productCode'>; no: number };
  customerPONumber?: string;
  header: string;
  today: Date;
}): ProductLabelFields {
  const { line } = input;
  return {
    ...EMPTY_PRODUCT_LABEL_FIELDS,
    date: formatProductLabelDate(input.today),
    header: input.header,
    customerPONumber: input.customerPONumber ?? '',
    ...(line && {
      lineNo: line.no,
      productCode: line.item.productCode,
      productName: line.item.productName || line.item.productCode,
    }),
  };
}

export const PRODUCT_LABEL_TEMPLATE_FIELDS: Record<
  ProductLabelTemplate,
  readonly ProductLabelEditableField[]
> = {
  template1: [
    'date',
    'header',
    'productCode',
    'productName',
    'color',
    'dimensions',
    'quantity',
    'packageCount',
    'customerPONumber',
  ],
  template2: ['header', 'productName', 'quantity', 'weight', 'customerPONumber', 'packageCount'],
};

export type ProductLabelOffset = { xMm: number; yMm: number };

export type ProductLabelPrintOptions = {
  size: ProductLabelSize;
  template: ProductLabelTemplate;

  paper?: ProductLabelSize;

  offset?: ProductLabelOffset;
};

const MM_PER_IN = 25.4;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelRow(label: string, value: string): string {
  return `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`;
}

function trialTag({ xMm, yMm }: ProductLabelOffset): string {
  const signed = (mm: number) => (mm > 0 ? `+${mm}` : String(mm));
  return `X${signed(xMm)} Y${signed(yMm)}`;
}

function headerText(header: string, tag?: string): string {
  const trial = tag ? ` <span class="trial">${escapeHtml(tag)}</span>` : '';
  return `${escapeHtml(header)}${trial}`;
}

function template1Body(f: ProductLabelFields, packageNo: string, tag?: string): string {
  return `
  <table class="t1">
    <tr><td colspan="2" class="band">${escapeHtml(f.date)}</td></tr>
    <tr><td colspan="2" class="band header">${headerText(f.header, tag)}</td></tr>
    ${labelRow('MÃ CODE', f.productCode)}
    ${labelRow('TÊN SP', f.productName)}
    ${labelRow('MÀU SẮC', f.color)}
    ${labelRow('KÍCH THƯỚC', f.dimensions)}
    ${labelRow('SỐ LƯỢNG', f.quantity)}
    ${labelRow('SỐ KIỆN', packageNo)}
    ${labelRow('SỐ PO', f.customerPONumber)}
  </table>`;
}

function template2Body(f: ProductLabelFields, packageNo: string, tag?: string): string {
  return `
  <table class="t2">
    <colgroup><col class="label-col" /><col /></colgroup>
    <tr><td colspan="2">${headerText(f.header, tag)}</td></tr>
    ${labelRow('Tên sản phẩm', f.productName)}
    ${labelRow('Số lượng', f.quantity)}
    ${labelRow('Cân nặng', f.weight)}
    ${labelRow('PO', f.customerPONumber)}
    ${labelRow('Số kiện', packageNo)}
  </table>`;
}

export function buildProductLabelHtml(
  fields: ProductLabelFields,
  options: ProductLabelPrintOptions,
  {
    autoPrint = true,
    trials,
  }: { autoPrint?: boolean; trials?: readonly ProductLabelOffset[] } = {},
): string {
  const { widthIn, heightIn } = PRODUCT_LABEL_SIZES[options.size];
  const page = PRODUCT_LABEL_SIZES[options.paper ?? options.size];

  const baseLeftIn = page.widthIn - widthIn;
  const baseTopIn = (page.heightIn - heightIn) / 2;

  const basePx = options.size === 'A7' ? 12 : 9;

  const sheet = (k: number, offset: ProductLabelOffset, tag?: string) => {
    const packageNo = `${fields.lineNo}/${k}`;
    const body =
      options.template === 'template1'
        ? template1Body(fields, packageNo, tag)
        : template2Body(fields, packageNo, tag);
    const left = (baseLeftIn + offset.xMm / MM_PER_IN).toFixed(3);
    const top = (baseTopIn + offset.yMm / MM_PER_IN).toFixed(3);
    return `<div class="sheet"><div class="label" style="left: ${left}in; top: ${top}in;">${body}
</div></div>`;
  };
  const offset = options.offset ?? { xMm: 0, yMm: 0 };
  const sheets = (
    trials
      ? trials.map((trial) => sheet(1, trial, trialTag(trial)))
      : Array.from({ length: fields.packageCount }, (_, i) => sheet(i + 1, offset))
  ).join('\n');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Label ${escapeHtml(fields.productCode || fields.productName)}</title>
<style>
  @page { size: ${page.widthIn}in ${page.heightIn}in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: ${basePx}px; color: #000; }
  .sheet { position: relative; width: ${page.widthIn}in; height: ${page.heightIn}in; overflow: hidden; }
  .sheet + .sheet { break-before: page; }
  .label { position: absolute; width: ${widthIn}in; height: ${heightIn}in; padding: ${PRODUCT_LABEL_INSET[options.size]}; overflow: hidden; }
  table { width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; font-size: 1.15em; }
  th, td { border: 1px solid #000; padding: 0.15em 0.3em; vertical-align: middle; word-break: break-word; }
  .t1 th { text-align: left; font-weight: normal; }
  .t1 td { text-align: center; }
  .t1 td.band { font-size: 1.05em; }
  .t1 td.header { font-weight: bold; font-size: 1.3em; }
  .t2 th, .t2 td { text-align: center; font-weight: bold; }
  .t2 col.label-col { width: 34%; }
  .trial { margin-left: 0.5em; font-weight: bold; }
</style>
</head>
<body>
${sheets}
${
  autoPrint
    ? `<script>
  window.addEventListener('load', function () { window.focus(); window.print(); });
  window.onafterprint = function () { window.close(); };
</script>`
    : ''
}
</body>
</html>`;
}

export function printProductLabel(
  fields: ProductLabelFields,
  options: ProductLabelPrintOptions,
  trials?: readonly ProductLabelOffset[],
): boolean {
  const win = window.open('', '_blank', 'width=500,height=700');
  if (!win) return false;
  win.document.open();
  win.document.write(buildProductLabelHtml(fields, options, { trials }));
  win.document.close();
  return true;
}
