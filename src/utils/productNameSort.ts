const collator = new Intl.Collator('vi', { numeric: true });

export function sortByProductName<T>(
  rows: T[],
  sort: string,
  nameOf: (row: T) => string | undefined,
): T[] {
  if (sort !== 'name_asc' && sort !== 'name_desc') return rows;
  const dir = sort === 'name_asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const na = nameOf(a)?.trim() ?? '';
    const nb = nameOf(b)?.trim() ?? '';
    if (na === '' || nb === '') return na === nb ? 0 : na === '' ? 1 : -1;
    return dir * collator.compare(na, nb);
  });
}
