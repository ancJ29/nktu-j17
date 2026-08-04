import { resolveClientCode } from '@/config/client-code';

export function buildUploadDirectory({
  type,
  id,
  noDate = false,
  date = new Date(),
}: {
  type: string;
  id: string;
  noDate?: boolean;
  date?: Date;
}): string {
  const clientCode = resolveClientCode();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (noDate) {
    return `c-mngt/${clientCode}/${type}/${id}`;
  }
  return `c-mngt/${clientCode}/${type}/${yyyy}-${mm}-${dd}/${id}`;
}

export function buildExpiringUploadDirectory({
  type,
  id,
  date = new Date(),
}: {
  type: string;
  id: string;
  date?: Date;
}): string {
  const clientCode = resolveClientCode();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `c-mngt/${clientCode}/${yyyy}-${mm}-${dd}/${type}/${id}`;
}

export function buildUploadFileName(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts36 = Date.now().toString(36);
  const dotIdx = safe.lastIndexOf('.');
  if (dotIdx <= 0) return `${safe}-${ts36}`;
  return `${safe.slice(0, dotIdx)}-${ts36}${safe.slice(dotIdx)}`;
}
