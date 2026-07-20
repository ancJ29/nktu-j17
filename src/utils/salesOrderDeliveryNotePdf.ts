

import { htmlToPdfBlob, sanitizeFilenameBase, shareOrDownloadFile } from '@/utils/pdfExport';
import type { ShareResult } from '@/utils/pdfExport';
import {
  buildDeliveryNoteStaticHtml,
  DEFAULT_PRINT_OPTIONS,
  type DeliveryNoteData,
  type DeliveryNotePaperSize,
  type DeliveryNotePrintOptions,
} from './salesOrderDeliveryNote';

function marginMmFor(paperSize: DeliveryNotePaperSize): number {
  return paperSize === 'A5' ? 10 : 14;
}

export async function renderDeliveryNotePdfBlob(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): Promise<Blob> {
  return htmlToPdfBlob(buildDeliveryNoteStaticHtml(data, options), {
    paperSize: options.paperSize,
    orientation: options.orientation,
    marginMm: marginMmFor(options.paperSize),
  });
}

export type ShareDeliveryNoteResult = ShareResult;

export async function shareDeliveryNotePdf(
  data: DeliveryNoteData,
  options: DeliveryNotePrintOptions = DEFAULT_PRINT_OPTIONS,
): Promise<ShareDeliveryNoteResult> {
  const blob = await renderDeliveryNotePdfBlob(data, options);
  const filename = `PHIẾU GIAO HÀNG ${sanitizeFilenameBase(data.orderNumber, 'delivery-note')}.pdf`;
  return shareOrDownloadFile(blob, filename);
}
