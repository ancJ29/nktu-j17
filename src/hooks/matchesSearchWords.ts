const fold = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').normalize('NFC').toLowerCase();

export function splitSearchWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

export function matchesSearchWords(
  words: readonly string[],
  fields: ReadonlyArray<string | null | undefined>,
): boolean {
  if (words.length === 0) return true;
  const haystacks = fields.map((f) => (f ? fold(f) : ''));
  return words.every((w) => haystacks.some((h) => h.includes(w)));
}
