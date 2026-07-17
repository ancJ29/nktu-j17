

import type { Employee } from '@/types';

export function formatYYMMDD_GMT7(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  let yy = '';
  let mm = '';
  let dd = '';
  for (const part of fmt.formatToParts(date)) {
    if (part.type === 'year') yy = part.value;
    else if (part.type === 'month') mm = part.value;
    else if (part.type === 'day') dd = part.value;
  }
  return `${yy}${mm}${dd}`;
}

export function buildStaffSegment(employee: Employee, codePrefix: string): string {
  const code = employee.code?.trim() ?? '';
  if (code) {
    const stripped = code.startsWith(codePrefix) ? code.slice(codePrefix.length) : code;
    const alnum = stripped.replace(/[^A-Za-z0-9]/g, '');
    if (alnum) return alnum;
  }
  
  return employee.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
}

export function buildDisplayOrderNumber(
  date: Date,
  employee: Employee,
  codePrefix: string,
  sequence: number,
): string {
  const yymmdd = formatYYMMDD_GMT7(date);
  const staff = buildStaffSegment(employee, codePrefix);
  const seq = String(sequence).padStart(3, '0');
  return `${yymmdd}${staff}${seq}`;
}
