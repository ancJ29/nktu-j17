

import { PAPER_MM, type Orientation, type PaperSize } from './printDocument';

export const PX_PER_MM = 96 / 25.4;

export const RASTER_SCALE = 2;

const DEFAULT_JPEG_QUALITY = 0.85;

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function sanitizeFilenameBase(name: string, fallback = 'document'): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || fallback;
}

export type PdfPageOptions = {
  paperSize: PaperSize;
  orientation: Orientation;
  
  marginMm?: number;
  
  jpegQuality?: number;
};

function defaultMarginMm(paperSize: PaperSize): number {
  return paperSize === 'A5' ? 8 : 12;
}

async function waitForAssets(idoc: Document): Promise<void> {
  const fonts = (idoc as Document & { fonts?: FontFaceSet }).fonts;
  const pending: Promise<unknown>[] = [];
  if (fonts?.ready) pending.push(fonts.ready);
  for (const img of Array.from(idoc.images)) {
    if (!img.complete) {
      pending.push(
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
      );
    }
  }
  await Promise.all(pending);
}

export async function htmlToPdfBlob(html: string, options: PdfPageOptions): Promise<Blob> {
  const { paperSize, orientation } = options;
  const marginMm = options.marginMm ?? defaultMarginMm(paperSize);
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const [shortSide, longSide] = PAPER_MM[paperSize];
  const pageWmm = orientation === 'landscape' ? longSide : shortSide;
  const renderWidthPx = Math.round(pageWmm * PX_PER_MM);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${renderWidthPx}px;height:10px;border:0;visibility:hidden;`;
  document.body.append(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) throw new Error('htmlToPdfBlob: iframe document unavailable');
    idoc.open();
    idoc.write(html);
    idoc.close();
    
    
    idoc.body.style.padding = `${marginMm}mm 0`;
    idoc.body.style.background = '#ffffff';

    await waitForAssets(idoc);

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(idoc.body, {
      backgroundColor: '#ffffff',
      scale: RASTER_SCALE,
      useCORS: true,
      width: renderWidthPx,
      windowWidth: renderWidthPx,
    });

    const { jsPDF } = await import('jspdf');
    const format = paperSize.toLowerCase() as 'a4' | 'a5';
    const pdf = new jsPDF({ unit: 'mm', format, orientation });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    
    const imgHmm = (canvas.height / canvas.width) * pdfW;
    const image = canvas.toDataURL('image/jpeg', jpegQuality);

    
    
    pdf.addImage(image, 'JPEG', 0, 0, pdfW, imgHmm);
    let heightLeftMm = imgHmm - pdfH;
    let offsetMm = 0;
    while (heightLeftMm > 0) {
      offsetMm -= pdfH;
      pdf.addPage(format, orientation);
      pdf.addImage(image, 'JPEG', 0, offsetMm, pdfW, imgHmm);
      heightLeftMm -= pdfH;
    }

    return pdf.output('blob');
  } finally {
    iframe.remove();
  }
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export async function shareOrDownloadFile(
  blob: Blob,
  filename: string,
  mimeType = 'application/pdf',
): Promise<ShareResult> {
  const file = new File([blob], filename, { type: mimeType });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Any other failure → fall through to the download fallback.
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
