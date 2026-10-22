import type { CropDiaryEntry } from '@/types';

export function entryDatePart(value: CropDiaryEntry['entryDate']): string {
  return String(value).slice(0, 10);
}

export type DiaryEntryGroups = {
  prep: CropDiaryEntry[];

  events: CropDiaryEntry[];
};

export function splitDiaryEntries(entries: CropDiaryEntry[], startDate?: string): DiaryEntryGroups {
  if (!startDate) return { prep: [], events: entries };

  const prep: CropDiaryEntry[] = [];
  const events: CropDiaryEntry[] = [];
  for (const entry of entries) {
    (entryDatePart(entry.entryDate) < startDate ? prep : events).push(entry);
  }

  prep.sort(
    (a, b) =>
      entryDatePart(a.entryDate).localeCompare(entryDatePart(b.entryDate)) ||
      (a.createdAt ?? 0) - (b.createdAt ?? 0),
  );
  events.sort(
    (a, b) =>
      entryDatePart(b.entryDate).localeCompare(entryDatePart(a.entryDate)) ||
      (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );
  return { prep, events };
}

export function expectsMaterial(entry: CropDiaryEntry): boolean {
  return entry.extra?.prepKind === 'material';
}

export function isMaterialPending(entry: CropDiaryEntry): boolean {
  return expectsMaterial(entry) && !(entry.extra?.materials?.length ?? 0);
}

export function completedOn(entry: CropDiaryEntry): string | undefined {
  const value = entry.extra?.completedDate;
  return typeof value === 'string' && value ? value : undefined;
}

export function prepEntryDefaultDate(startDate: string, today: string): string {
  if (today < startDate) return today;
  const [y, m, d] = startDate.split('-').map(Number);
  if (!y || !m || !d) return startDate;
  const before = new Date(Date.UTC(y, m - 1, d - 1));
  return before.toISOString().slice(0, 10);
}
