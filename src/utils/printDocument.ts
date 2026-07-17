

export type PaperSize = 'A4' | 'A5';
export type Orientation = 'portrait' | 'landscape';

export const PAPER_MM: Record<PaperSize, readonly [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
};

export function contentWidthMm(
  paperSize: PaperSize,
  orientation: Orientation,
  marginMm: number,
): number {
  const [shortSide, longSide] = PAPER_MM[paperSize];
  const pageWidthMm = orientation === 'landscape' ? longSide : shortSide;
  return pageWidthMm - marginMm * 2;
}

export function formatVndMoney(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSelfPrintingHtml(opts: {
  title: string;
  css: string;
  bodyHtml: string;
  lang?: string;
}): string {
  const { title, css, bodyHtml, lang = 'vi' } = opts;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${bodyHtml}
  <script>
    window.addEventListener('load', function () {
      window.focus();
      window.print();
    });
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;
}

export function openPrintWindow(html: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
