import * as XLSX from 'xlsx';
import { ExcelParseError } from './excelParser';
import type { TemplateExcelRow } from './cropDiaryTemplateModel';

type Field = 'day' | 'activity' | 'materialName' | 'quantity' | 'unit' | 'memo';

const HEADER_MAPPING: Record<string, Field> = {
  
  day: 'day',
  activity: 'activity',
  material: 'materialName',
  quantity: 'quantity',
  qty: 'quantity',
  unit: 'unit',
  memo: 'memo',
  note: 'memo',
  notes: 'memo',
  
  ngày: 'day',
  'hoạt động': 'activity',
  'nguyên liệu': 'materialName',
  'vật tư': 'materialName',
  'số lượng': 'quantity',
  'đơn vị': 'unit',
  'ghi chú': 'memo',
};

const REQUIRED_FIELDS: ReadonlyArray<Field> = ['day', 'activity'];

export function parseCropDiaryTemplateFile(file: File): Promise<TemplateExcelRow[]> {
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as unknown[][];

        if (sheetData.length < 2) {
          reject(new Error('File must contain at least a header row and one data row'));
          return;
        }

        const headers = sheetData[0].map((h) => String(h).trim().toLowerCase());
        const present = new Set<Field>();
        for (const h of headers) {
          const f = HEADER_MAPPING[h];
          if (f) present.add(f);
        }
        const missing = REQUIRED_FIELDS.filter((f) => !present.has(f));
        if (missing.length > 0) {
          reject(new ExcelParseError(missing));
          return;
        }

        const rows: TemplateExcelRow[] = [];
        for (let i = 1; i < sheetData.length; i++) {
          const values = sheetData[i].map((v) => String(v).trim());
          if (values.every((v) => !v)) continue;

          const row: TemplateExcelRow = {
            day: NaN,
            activity: '',
            materialName: '',
            unit: '',
            memo: '',
          };
          for (const [idx, header] of headers.entries()) {
            const value = values[idx];
            if (!value) continue;
            const field = HEADER_MAPPING[header];
            if (!field) continue;
            if (field === 'day') {
              row.day = Math.floor(Number(value.replace(/,/g, '')));
            } else if (field === 'quantity') {
              const n = Number(value.replace(/,/g, ''));
              if (Number.isFinite(n) && n > 0) row.quantity = n;
            } else {
              row[field] = value;
            }
          }
          if (Number.isFinite(row.day) && row.day >= 1) rows.push(row);
        }

        resolve(rows);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    });

    reader.addEventListener('error', () => reject(new Error('Failed to read file')));
    reader.readAsArrayBuffer(file);
  });
}

type Labels = {
  day: string;
  activity: string;
  material: string;
  quantity: string;
  unit: string;
  memo: string;
  sheetName: string;
};

function buildSheet(rows: TemplateExcelRow[], labels: Labels): XLSX.WorkBook {
  const headerRow = [
    labels.day,
    labels.activity,
    labels.material,
    labels.quantity,
    labels.unit,
    labels.memo,
  ];
  const dataRows = rows.map((r) => [
    r.day,
    r.activity,
    r.materialName,
    typeof r.quantity === 'number' ? r.quantity : '',
    r.unit,
    r.memo,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 32 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, labels.sheetName);
  return wb;
}

export function exportCropDiaryTemplateRows(
  rows: TemplateExcelRow[],
  labels: Labels,
  fileName: string,
): void {
  XLSX.writeFile(buildSheet(rows, labels), fileName);
}

export type TemplateSampleExamples = {
  
  activityWithMaterial: string;
  
  activityPlain: string;
  
  memo: string;
  
  materialNames: readonly [string, string];
  
  unit: string;
};

export function downloadCropDiaryTemplateSample(
  labels: Labels,
  examples: TemplateSampleExamples,
  fileName: string,
): void {
  const [material1, material2] = examples.materialNames;
  const sample: TemplateExcelRow[] = [
    {
      day: 1,
      activity: examples.activityWithMaterial,
      materialName: material1,
      quantity: 2,
      unit: examples.unit,
      memo: examples.memo,
    },
    
    { day: 1, activity: '', materialName: material2, quantity: 1, unit: examples.unit, memo: '' },
    { day: 2, activity: examples.activityPlain, materialName: '', unit: '', memo: '' },
  ];
  XLSX.writeFile(buildSheet(sample, labels), fileName);
}
