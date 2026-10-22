import type { CropDiaryEntry, MaterialLine } from '@/types';

export type CropMaterialTotal = {
  materialCode: string;
  
  unit?: string;
  
  quantity?: number;
  
  lineCount: number;
};

const SEP = '\u0000';

export function aggregateCropMaterials(entries: CropDiaryEntry[]): CropMaterialTotal[] {
  const totals = new Map<string, CropMaterialTotal>();
  for (const entry of entries) {
    const lines: MaterialLine[] = entry.extra?.materials ?? [];
    for (const line of lines) {
      const code = line.materialCode?.trim();
      if (!code) continue;
      const unit = line.unit?.trim() || undefined;
      const key = code + SEP + (unit ?? '');
      const cur = totals.get(key) ?? { materialCode: code, unit, lineCount: 0 };
      cur.lineCount += 1;
      if (typeof line.quantity === 'number') {
        cur.quantity = (cur.quantity ?? 0) + line.quantity;
      }
      totals.set(key, cur);
    }
  }
  return [...totals.values()].sort(
    (a, b) =>
      a.materialCode.localeCompare(b.materialCode) || (a.unit ?? '').localeCompare(b.unit ?? ''),
  );
}
