import { htmlToPdfBlob, sanitizeFilenameBase, shareOrDownloadFile } from '@/utils/pdfExport';
import type { ShareResult } from '@/utils/pdfExport';
import {
  buildQuotationStaticHtml,
  DEFAULT_QUOTATION_PRINT_OPTIONS,
  type QuotationPrintData,
  type QuotationPrintOptions,
} from './quotationPrint';

export type ShareQuotationResult = ShareResult;

export async function renderQuotationPdfBlob(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): Promise<Blob> {
  return htmlToPdfBlob(buildQuotationStaticHtml(data, options), options);
}

export async function shareQuotationPdf(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): Promise<ShareQuotationResult> {
  const blob = await renderQuotationPdfBlob(data, options);
  const filename = `BÁO GIÁ ${sanitizeFilenameBase(data.code, 'quotation')}.pdf`;
  return shareOrDownloadFile(blob, filename);
}
