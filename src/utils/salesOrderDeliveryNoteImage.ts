import { downloadBlob, PX_PER_MM } from './pdfExport';
import {
  buildDeliveryNoteParts,
  DEFAULT_PRINT_OPTIONS,
  type DeliveryNoteData,
  type DeliveryNotePrintOptions,
} from './salesOrderDeliveryNote';

const PAD_PX = 16;

const SCALE = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to render delivery-note image'));
    img.src = src;
  });
}

export async function renderDeliveryNoteImageBlob(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): Promise<Blob> {
  const { css, docHtml, contentWidthMm } = buildDeliveryNoteParts(data, options);
  const widthPx = Math.ceil(contentWidthMm * PX_PER_MM) + PAD_PX * 2;

  const wrapperStyle = `width:${widthPx}px;background:#ffffff;padding:${PAD_PX}px;`;
  const measure = document.createElement('div');
  measure.setAttribute('style', `position:fixed;left:-100000px;top:0;${wrapperStyle}`);
  measure.innerHTML = `<style>${css}</style>${docHtml}`;
  document.body.appendChild(measure);
  const heightPx = Math.ceil(measure.getBoundingClientRect().height);
  document.body.removeChild(measure);

  const xhtml = `<div xmlns="http://www.w3.org/1999/xhtml" style="${wrapperStyle}"><style>${css}</style>${docHtml}</div>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx * SCALE;
  canvas.height = heightPx * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode delivery-note PNG'))),
      'image/png',
    );
  });
}

export type CopyImageResult = 'copied' | 'downloaded';

export async function copyDeliveryNoteImageToClipboard(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
  fileName = `delivery_note_${data.orderNumber}.png`,
): Promise<CopyImageResult> {
  const blobPromise = renderDeliveryNoteImageBlob(data, options);

  const clipboardSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined';

  if (clipboardSupported) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
      return 'copied';
    } catch {
      // Browser refused the clipboard write (unsupported MIME / permission) —
      // fall through to a download so the operator still gets the image.
    }
  }

  downloadBlob(await blobPromise, fileName);
  return 'downloaded';
}
