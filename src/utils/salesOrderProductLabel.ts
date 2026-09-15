export type ProductLabelSize = 'small' | 'A7';
export type ProductLabelTemplate = 'template1' | 'template2';

export const PRODUCT_LABEL_SIZES: Record<
  ProductLabelSize,
  { widthIn: number; heightIn: number; label: string }
> = {
  small: { widthIn: 3.15, heightIn: 1.97, label: '3.15" × 1.97"' },
  A7: { widthIn: 4.08, heightIn: 2.89, label: 'A7 — 4.08" × 2.89"' },
};

export type ProductLabelFields = {
  date: string;
  header: string;
  productCode: string;
  productName: string;
  color: string;
  dimensions: string;
  quantity: string;
  unit: string;
  weight: string;
  customerPONumber: string;
  packageCount: string;
};

export const EMPTY_PRODUCT_LABEL_FIELDS: ProductLabelFields = {
  date: '',
  header: '',
  productCode: '',
  productName: '',
  color: '',
  dimensions: '',
  quantity: '',
  unit: '',
  weight: '',
  customerPONumber: '',
  packageCount: '',
};

export function formatProductLabelDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function buildDefaultProductLabelFields(input: {
  item?: { productName: string; productCode: string; quantity: number };
  customerPONumber?: string;
  header: string;
  today: Date;
}): ProductLabelFields {
  const { item } = input;
  return {
    ...EMPTY_PRODUCT_LABEL_FIELDS,
    date: formatProductLabelDate(input.today),
    header: input.header,
    customerPONumber: input.customerPONumber ?? '',
    ...(item && {
      productName: item.productName || item.productCode,
      quantity: String(item.quantity),
    }),
  };
}

export const PRODUCT_LABEL_TEMPLATE_FIELDS: Record<
  ProductLabelTemplate,
  readonly (keyof ProductLabelFields)[]
> = {
  template1: [
    'date',
    'header',
    'productCode',
    'productName',
    'color',
    'dimensions',
    'quantity',
    'customerPONumber',
  ],
  template2: [
    'header',
    'productName',
    'quantity',
    'unit',
    'weight',
    'customerPONumber',
    'packageCount',
  ],
};

export type ProductLabelPrintOptions = {
  size: ProductLabelSize;
  template: ProductLabelTemplate;
};

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

function template1Body(f: ProductLabelFields): string {
  return `
  <table class="t1">
    <tr><td colspan="2" class="band">${escapeHtml(f.date)}</td></tr>
    <tr><td colspan="2" class="band header">${escapeHtml(f.header)}</td></tr>
    ${labelRow('MÃ CODE', f.productCode)}
    ${labelRow('TÊN SP', f.productName)}
    ${labelRow('MÀU SẮC', f.color)}
    ${labelRow('KÍCH THƯỚC', f.dimensions)}
    ${labelRow('SỐ LƯỢNG', f.quantity)}
    ${labelRow('SỐ PO', f.customerPONumber)}
  </table>`;
}

function template2Body(f: ProductLabelFields): string {
  return `
  <table class="t2">
    <tr><td colspan="2">${escapeHtml(f.header)}</td></tr>
    ${labelRow('Tên sản phẩm', f.productName)}
    ${labelRow('Số lượng', [f.quantity, f.unit].filter(Boolean).join(' '))}
    ${labelRow('Cân nặng', f.weight)}
    ${labelRow('PO', f.customerPONumber)}
    ${labelRow('Số kiện', f.packageCount)}
  </table>`;
}

export function buildProductLabelHtml(
  fields: ProductLabelFields,
  options: ProductLabelPrintOptions,
  { autoPrint = true }: { autoPrint?: boolean } = {},
): string {
  const { widthIn, heightIn } = PRODUCT_LABEL_SIZES[options.size];

  const basePx = options.size === 'A7' ? 12 : 9;
  const body = options.template === 'template1' ? template1Body(fields) : template2Body(fields);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Label ${escapeHtml(fields.productCode || fields.productName)}</title>
<style>
  @page { size: ${widthIn}in ${heightIn}in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: ${basePx}px; color: #000; }
  .label { width: ${widthIn}in; height: ${heightIn}in; padding: 0.08in; overflow: hidden; }
  table { width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; font-size: 1.15em; }
  th, td { border: 1px solid #000; padding: 0.15em 0.3em; vertical-align: middle; word-break: break-word; }
  .t1 th { width: 42%; text-align: left; font-weight: normal; }
  .t1 td { text-align: center; }
  .t1 td.band { font-size: 1.05em; }
  .t1 td.header { font-weight: bold; font-size: 1.3em; }
  .t2 th, .t2 td { text-align: center; font-weight: bold; }
  .t2 th { width: 34%; }
</style>
</head>
<body>
<div class="label">${body}
</div>
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
): boolean {
  const win = window.open('', '_blank', 'width=500,height=700');
  if (!win) return false;
  win.document.open();
  win.document.write(buildProductLabelHtml(fields, options));
  win.document.close();
  return true;
}
