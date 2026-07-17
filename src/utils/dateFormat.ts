
import { appConfig } from '@/config';
import type { CMngtDisplaySettings, DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';

export type DateInput = number | Date | string;

function getSettings(): CMngtDisplaySettings {
  return (
    appConfig.displaySettings ?? {
      dateFormat: 'DD/MM/YYYY',
      dateTimeFormat: 'HH:mm DD/MM/YYYY',
    }
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function parts(value: DateTimeInput) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return {
    YYYY: d.getFullYear().toString().padStart(4, '0'),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
  };
}

function applyDateFormat(p: NonNullable<ReturnType<typeof parts>>, fmt: string): string {
  switch (fmt) {
    case 'DD/MM/YYYY':
      return `${p.DD}/${p.MM}/${p.YYYY}`;
    case 'YYYY/MM/DD':
      return `${p.YYYY}/${p.MM}/${p.DD}`;
    case 'MM/DD/YYYY':
      return `${p.MM}/${p.DD}/${p.YYYY}`;
    case 'YYYY-MM-DD':
      return `${p.YYYY}-${p.MM}-${p.DD}`;
    case 'DD-MM-YYYY':
      return `${p.DD}-${p.MM}-${p.YYYY}`;
    default:
      return `${p.DD}/${p.MM}/${p.YYYY}`;
  }
}

function applyDateTimeFormat(p: NonNullable<ReturnType<typeof parts>>, fmt: string): string {
  const time = `${p.HH}:${p.mm}`;
  switch (fmt) {
    case 'HH:mm DD/MM/YYYY':
      return `${time} ${p.DD}/${p.MM}/${p.YYYY}`;
    case 'DD/MM/YYYY HH:mm':
      return `${p.DD}/${p.MM}/${p.YYYY} ${time}`;
    case 'HH:mm YYYY/MM/DD':
      return `${time} ${p.YYYY}/${p.MM}/${p.DD}`;
    case 'YYYY/MM/DD HH:mm':
      return `${p.YYYY}/${p.MM}/${p.DD} ${time}`;
    case 'HH:mm MM/DD/YYYY':
      return `${time} ${p.MM}/${p.DD}/${p.YYYY}`;
    case 'MM/DD/YYYY HH:mm':
      return `${p.MM}/${p.DD}/${p.YYYY} ${time}`;
    case 'YYYY-MM-DD HH:mm':
      return `${p.YYYY}-${p.MM}-${p.DD} ${time}`;
    case 'HH:mm YYYY-MM-DD':
      return `${time} ${p.YYYY}-${p.MM}-${p.DD}`;
    case 'HH:mm DD-MM-YYYY':
      return `${time} ${p.DD}-${p.MM}-${p.YYYY}`;
    default:
      return `${time} ${p.DD}/${p.MM}/${p.YYYY}`;
  }
}

export function getDateFormat(): string {
  return getSettings().dateFormat;
}

export function getDateTimeFormat(): string {
  return getSettings().dateTimeFormat;
}

export function formatDate(value: NullableDateTimeInput): string {
  if (!value) return '-';
  const p = parts(value);
  if (!p) return '-';
  return applyDateFormat(p, getSettings().dateFormat);
}

export function formatDateTime(value: NullableDateTimeInput): string {
  if (!value) return '-';
  const p = parts(value);
  if (!p) return '-';
  return applyDateTimeFormat(p, getSettings().dateTimeFormat);
}
