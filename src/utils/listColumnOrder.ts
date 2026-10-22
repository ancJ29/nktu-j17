export function orderListColumns<Column extends { key: string }>(
  columns: readonly Column[],
  order: readonly string[],
  hidden: readonly string[] = [],
): Column[] {
  const drawn =
    hidden.length === 0 ? columns : columns.filter((column) => !hidden.includes(column.key));
  if (order.length === 0) return [...drawn];
  const byKey = new Map(drawn.map((column) => [column.key, column]));
  const seen = new Set<string>();

  const pinned = order.flatMap((key) => {
    const column = byKey.get(key);
    if (!column || seen.has(key)) return [];
    seen.add(key);
    return [column];
  });
  return [...pinned, ...drawn.filter((column) => !seen.has(column.key))];
}
