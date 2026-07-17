

import * as XLSX from 'xlsx';
import { ExcelParseError } from './excelParser';

import { DEFAULT_LOCATION_CODE } from '@/types/location';
import { getCurrentPeriodKey } from './periodKey';

export { ExcelParseError } from './excelParser';

export type InventoryExportRow = {
  readonly itemCode: string;
  readonly locationCode: string;
  readonly onHand: number;
  readonly extra?: {
    readonly unit?: string;
    
    readonly beginOfPeriod?: Readonly<Record<string, number>>;
  };
};

export type InventoryExportItem = {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly isActive: boolean;
  readonly extra?: { readonly sku?: string; readonly isDeleted?: boolean };
};

export type InventoryExportOptions = {
  language?: string;
  
  entityType: 'product' | 'material';
};

export const exportInventoryToExcel = (
  rows: ReadonlyArray<InventoryExportRow>,
  items: ReadonlyArray<InventoryExportItem>,
  { language, entityType }: InventoryExportOptions,
): void => {
  const isVietnamese = language === 'vi';

  type ColumnKey = 'itemName' | 'sku' | 'unit' | 'onHand' | 'beginOfPeriod';
  type Column = { key: ColumnKey; header: string; width: number };

  const itemLabel = isVietnamese
    ? entityType === 'product'
      ? 
        'Tên sản phẩm'
      : 
        'Tên nguyên vật liệu'
    : entityType === 'product'
      ? 'Product Name'
      : 'Material Name';

  const periodKey = getCurrentPeriodKey();
  
  
  
  
  const periodDisplay = `${periodKey.slice(0, 4)}-${periodKey.slice(4)}`;

  const labels: Record<ColumnKey, string> = isVietnamese
    ? {
        itemName: itemLabel,
        sku: 'SKU',
        unit: 'Đơn vị',
        onHand: 'Tồn kho',
        
        beginOfPeriod: `Tồn đầu kỳ (${periodDisplay})`,
      }
    : {
        itemName: itemLabel,
        sku: 'SKU',
        unit: 'Unit',
        onHand: 'On Hand',
        beginOfPeriod: `Begin of Period (${periodDisplay})`,
      };

  const columns: Column[] = [
    { key: 'itemName', header: labels.itemName, width: 32 },
    { key: 'sku', header: labels.sku, width: 18 },
    { key: 'unit', header: labels.unit, width: 12 },
    { key: 'onHand', header: labels.onHand, width: 12 },
    { key: 'beginOfPeriod', header: labels.beginOfPeriod, width: 18 },
  ];

  
  
  const totalsByCode = new Map<string, number>();
  
  
  
  
  const beginByCode = new Map<string, number>();
  const beginSeenByCode = new Set<string>();
  for (const row of rows) {
    totalsByCode.set(row.itemCode, (totalsByCode.get(row.itemCode) ?? 0) + row.onHand);
    const begin = row.extra?.beginOfPeriod?.[periodKey];
    if (typeof begin === 'number') {
      beginByCode.set(row.itemCode, (beginByCode.get(row.itemCode) ?? 0) + begin);
      beginSeenByCode.add(row.itemCode);
    }
  }

  const dataRows: Array<Array<string | number>> = [];
  for (const item of items) {
    
    
    if (!item.isActive || item.extra?.isDeleted) continue;
    const cells: Record<ColumnKey, string | number> = {
      itemName: item.name,
      sku: item.extra?.sku ?? '',
      unit: item.unit,
      onHand: totalsByCode.get(item.code) ?? 0,
      
      
      
      beginOfPeriod: beginSeenByCode.has(item.code) ? (beginByCode.get(item.code) ?? 0) : '',
    };
    dataRows.push(columns.map((c) => cells[c.key]));
  }

  const headerRow = columns.map((c) => c.header);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((c) => ({ width: c.width }));

  const sheetName = isVietnamese
    ? entityType === 'product'
      ? 
        'Tồn kho sản phẩm'
      : 
        'Tồn kho nguyên vật liệu'
    : entityType === 'product'
      ? 'Product Inventory'
      : 'Material Inventory';
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  
  
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  
  
  let prefix = entityType === 'product' ? 'tồn_kho_sản_phẩm' : 'tồn_kho_nguyên_vật_liệu';
  if (!isVietnamese) {
    prefix = entityType === 'product' ? 'product_inventory' : 'material_inventory';
  }
  XLSX.writeFile(workbook, `${prefix}_${yyyy}-${mm}-${dd}.xlsx`);
};

export type ParsedInventoryRow = {
  
  readonly rowNumber: number;
  readonly sku?: string;
  readonly itemCode?: string;
  readonly locationCode?: string;
  readonly onHand: number;
  readonly unit?: string;
  
  readonly beginOfPeriod?: number;
};

const REQUIRED_INVENTORY_FIELDS: ReadonlyArray<'onHand'> = ['onHand'];

export const parseInventoryExcelFile = async (file: File): Promise<ParsedInventoryRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());

        type FieldKey = 'sku' | 'itemCode' | 'locationCode' | 'onHand' | 'unit' | 'beginOfPeriod';
        
        
        
        const headerPrefixMapping: Record<string, FieldKey> = {
          'begin of period': 'beginOfPeriod',
          'beginning of period': 'beginOfPeriod',
          'opening balance': 'beginOfPeriod',
          'tồn đầu kỳ': 'beginOfPeriod',
          'đầu kỳ': 'beginOfPeriod',
        };
        const headerMapping: Record<string, FieldKey> = {
          
          sku: 'sku',
          'item code': 'itemCode',
          'product code': 'itemCode',
          'material code': 'itemCode',
          code: 'itemCode',
          'location code': 'locationCode',
          location: 'locationCode',
          'on hand': 'onHand',
          onhand: 'onHand',
          stock: 'onHand',
          quantity: 'onHand',
          qty: 'onHand',
          unit: 'unit',
          
          'mã sản phẩm': 'itemCode',
          'mã nguyên vật liệu': 'itemCode',
          mã: 'itemCode',
          'mã vị trí': 'locationCode',
          'vị trí': 'locationCode',
          'tồn kho': 'onHand',
          'số lượng': 'onHand',
          'đơn vị': 'unit',
        };
        const resolveField = (header: string): FieldKey | undefined => {
          const direct = headerMapping[header];
          if (direct) return direct;
          for (const prefix of Object.keys(headerPrefixMapping)) {
            if (header.startsWith(prefix)) return headerPrefixMapping[prefix];
          }
          return undefined;
        };

        
        
        
        const presentFields = new Set<FieldKey>();
        for (const h of headers) {
          const f = resolveField(h);
          if (f) presentFields.add(f);
        }
        const missing = REQUIRED_INVENTORY_FIELDS.filter((f) => !presentFields.has(f));
        
        
        if (!presentFields.has('sku') && !presentFields.has('itemCode')) {
          reject(new ExcelParseError(['identity']));
          return;
        }
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const rows: ParsedInventoryRow[] = [];
        for (let index = 1; index < sheetData.length; index++) {
          const values = sheetData[index].map((v) => String(v).trim());
          if (values.every((v) => !v)) continue;

          let sku: string | undefined;
          let itemCode: string | undefined;
          let locationCode: string | undefined;
          let onHand: number | undefined;
          let unit: string | undefined;
          let beginOfPeriod: number | undefined;

          for (const [headerIndex, header] of headers.entries()) {
            const value = values[headerIndex];
            if (!value) continue;
            const fieldName = resolveField(header);
            if (!fieldName) continue;

            if (fieldName === 'onHand') {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n >= 0) onHand = n;
            } else if (fieldName === 'beginOfPeriod') {
              
              
              
              
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n >= 0) beginOfPeriod = n;
            } else if (fieldName === 'sku') {
              sku = value;
            } else if (fieldName === 'itemCode') {
              itemCode = value;
            } else if (fieldName === 'locationCode') {
              locationCode = value;
            } else if (fieldName === 'unit') {
              unit = value;
            }
          }

          if (typeof onHand === 'number' && (sku || itemCode)) {
            rows.push({
              rowNumber: index + 1,
              sku,
              itemCode,
              locationCode,
              onHand,
              unit,
              ...(beginOfPeriod !== undefined && { beginOfPeriod }),
            });
          }
        }

        resolve(rows);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });

    reader.readAsArrayBuffer(file);
  });
};

export type InventoryReconcileItem = {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly extra?: { readonly sku?: string; readonly units?: string[] };
};

export type ReconciledInventoryRow = {
  readonly itemCode: string;
  readonly locationCode: string;
  readonly onHand: number;
  readonly unit: string;
  
  readonly beginOfPeriod?: number;
};

export type ReconciliationResult = {
  
  readonly matched: ReconciledInventoryRow[];
  
  readonly unmatched: ParsedInventoryRow[];
};

export const reconcileInventoryRows = (
  parsed: ReadonlyArray<ParsedInventoryRow>,
  items: ReadonlyArray<InventoryReconcileItem>,
): ReconciliationResult => {
  const byCode = new Map<string, InventoryReconcileItem>();
  const bySku = new Map<string, InventoryReconcileItem>();
  for (const it of items) {
    byCode.set(it.code, it);
    const sku = it.extra?.sku?.trim();
    if (sku) bySku.set(sku.toLowerCase(), it);
  }

  const matchedByPair = new Map<string, ReconciledInventoryRow>();
  const unmatched: ParsedInventoryRow[] = [];
  for (const row of parsed) {
    const skuKey = row.sku?.trim().toLowerCase();
    const codeKey = row.itemCode?.trim();
    const hit = (skuKey && bySku.get(skuKey)) || (codeKey && byCode.get(codeKey));
    if (!hit) {
      unmatched.push(row);
      continue;
    }
    const units = hit.extra?.units?.length ? hit.extra.units : hit.unit ? [hit.unit] : [];
    
    
    
    const typedUnit = row.unit?.toLowerCase();
    const unit =
      (typedUnit && units.find((u) => u.toLowerCase() === typedUnit)) ?? units[0] ?? hit.unit ?? '';
    const locationCode = row.locationCode?.trim() || DEFAULT_LOCATION_CODE;
    matchedByPair.set(`${hit.code}::${locationCode}`, {
      itemCode: hit.code,
      locationCode,
      onHand: row.onHand,
      unit,
      ...(row.beginOfPeriod !== undefined && { beginOfPeriod: row.beginOfPeriod }),
    });
  }

  return { matched: Array.from(matchedByPair.values()), unmatched };
};
