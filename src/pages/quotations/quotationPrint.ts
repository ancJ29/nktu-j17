

import { byClient } from '@/config/client';
import type { CompanyInfo } from '@/config/companyInfo';
import type { Orientation, PaperSize } from '@/utils/printDocument';
import { buildDefaultQuotationStaticHtml, printDefaultQuotation } from './quotationPrintDefault';
import { buildNktuQuotationStaticHtml, printNktuQuotation } from './quotationPrintNktu';

export type QuotationPaperSize = PaperSize;
export type QuotationOrientation = Orientation;

export type QuotationPrintOptions = {
  paperSize: PaperSize;
  orientation: Orientation;
};

export const DEFAULT_QUOTATION_PRINT_OPTIONS: QuotationPrintOptions = {
  paperSize: 'A4',
  orientation: 'portrait',
};

export type QuotationPrintLine = {
  
  name: string;
  
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  
  photoUrl?: string;
};

export type QuotationPrintData = {
  seller: CompanyInfo;
  
  code: string;
  
  dateText: string;
  customer: {
    name: string;
    address: string;
    taxCode: string;
    phone: string;
  };
  lines: QuotationPrintLine[];
  
  subtotal: number;
  
  vatPercent: number;
  
  vatAmount: number;
  
  grandTotal: number;
  
  amountInWords: string;
  
  note?: string;
  
  showPhoto?: boolean;
  
  showVat?: boolean;
};

const printQuotationForClient = byClient({ nktu: printNktuQuotation }, printDefaultQuotation);

const buildQuotationStaticHtmlForClient = byClient(
  { nktu: buildNktuQuotationStaticHtml },
  buildDefaultQuotationStaticHtml,
);

export function printQuotation(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): boolean {
  return printQuotationForClient(data, options);
}

export function buildQuotationStaticHtml(
  data: QuotationPrintData,
  options: QuotationPrintOptions = DEFAULT_QUOTATION_PRINT_OPTIONS,
): string {
  return buildQuotationStaticHtmlForClient(data, options);
}
