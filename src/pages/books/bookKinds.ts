import { cashBookBundle } from '@/stores/useBookStores';
import { productStockLogBundle } from '@/stores/useBookStores';
import type { BookEntry, BookEntryExtra, Product } from '@/types';
import { perms } from '@/utils/permission';
import { vendorCodesOf } from '@/utils/productVendorCodes';
import { formatMonthKey, monthKeyOf, type BookPick, type BookValueKind } from './bookModel';

export type BookPickColumn = {
  headerKey: string;

  placeholderKey: string;
  required: boolean;

  options: (existing?: BookEntry) => BookPick[];

  pickOf: (row: BookEntry) => BookPick | undefined;
};

export type BookKind = {
  i18nPrefix: 'cashBook' | 'stockLog';
  valueKind: BookValueKind;
  bundle: typeof cashBookBundle;

  partitionKeyOf: (recordDate: string) => string;

  partitionLabel?: (key: string) => string;
  canCreate: () => boolean;
  canEdit: () => boolean;
  canDelete: () => boolean;

  fixedExtra?: Partial<BookEntryExtra>;

  unit?: string;
  pickColumn?: BookPickColumn;
};

export const CASH_BOOK_KIND: BookKind = {
  i18nPrefix: 'cashBook',
  valueKind: 'money',
  bundle: cashBookBundle,
  partitionKeyOf: monthKeyOf,
  partitionLabel: formatMonthKey,
  canCreate: () => perms.cashBook.canCreate(),
  canEdit: () => perms.cashBook.canEdit(),
  canDelete: () => perms.cashBook.canDelete(),
};

const pickKey = (vendorCode: string, vendorItemCode: string) =>
  `${vendorCode}\u0000${vendorItemCode}`;

export function stockLogPickOf(row: BookEntry): BookPick | undefined {
  const { vendorCode, vendorName, vendorItemCode } = row.extra;
  if (!vendorCode || !vendorItemCode) return undefined;
  return {
    key: pickKey(vendorCode, vendorItemCode),
    label: `${vendorName || vendorCode} · ${vendorItemCode}`,
    snapshot: { vendorCode, vendorName: vendorName ?? '', vendorItemCode },
  };
}

export const primaryUnitOf = (product: Pick<Product, 'unit' | 'extra'>): string =>
  product.extra?.units?.[0] ?? product.unit ?? '';

export function stockLogKindFor(product: Product): BookKind {
  const unit = primaryUnitOf(product);
  const current = (): BookPick[] =>
    vendorCodesOf(product.extra).map((e) => ({
      key: pickKey(e.vendorCode, e.code),
      label: `${e.vendorName || e.vendorCode} · ${e.code}`,
      snapshot: { vendorCode: e.vendorCode, vendorName: e.vendorName, vendorItemCode: e.code },
    }));
  return {
    i18nPrefix: 'stockLog',
    valueKind: 'quantity',
    bundle: productStockLogBundle,
    partitionKeyOf: () => product.id,
    canCreate: () => perms.productStockLog.canCreate(),
    canEdit: () => perms.productStockLog.canEdit(),
    canDelete: () => perms.productStockLog.canDelete(),
    fixedExtra: { productId: product.id, productCode: product.code, unit },
    unit,
    pickColumn: {
      headerKey: 'books.stockLog.columns.vendorCode',
      placeholderKey: 'books.stockLog.pickPlaceholder',
      required: true,
      options: (existing) => {
        const options = current();
        const own = existing ? stockLogPickOf(existing) : undefined;
        return own && !options.some((o) => o.key === own.key) ? [...options, own] : options;
      },
      pickOf: stockLogPickOf,
    },
  };
}
