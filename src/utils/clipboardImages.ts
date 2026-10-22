export type PasteClipboard = {
  getData(type: string): string;
  files?: ArrayLike<File> | null;
  items?: ArrayLike<DataTransferItem> | null;
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
    null
  );
}

function stamp(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function clipboardImageFiles(
  clipboard: PasteClipboard | null | undefined,
  { intoTextEntry = false, now = Date.now() }: { intoTextEntry?: boolean; now?: number } = {},
): File[] {
  if (!clipboard) return [];
  if (intoTextEntry && clipboard.getData('text/plain').trim() !== '') return [];

  const fromFiles = Array.from(clipboard.files ?? []);

  const candidates = fromFiles.length
    ? fromFiles
    : Array.from(clipboard.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

  const images = candidates.filter((file) => file.type.startsWith('image/'));
  const base = stamp(now);

  return images.map((file, index) => {
    const ext = EXTENSION_BY_TYPE[file.type] ?? file.type.slice('image/'.length) ?? 'png';
    const suffix = images.length > 1 ? `-${index + 1}` : '';
    return new File([file], `clipboard-${base}${suffix}.${ext}`, { type: file.type });
  });
}
