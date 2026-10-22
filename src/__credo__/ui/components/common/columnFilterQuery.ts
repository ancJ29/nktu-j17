

type NumericTest = (value: number) => boolean;

const NUMBER = String.raw`-?[\d.,]+`;
const BETWEEN = new RegExp(String.raw`^(${NUMBER})\s*~\s*(${NUMBER})$`);
const COMPARISON = new RegExp(String.raw`^(>=|<=|≥|≤|>|<)\s*(${NUMBER})$`);
const GROUPED = /^-?\d{1,3}([.,])\d{3}(?:\1\d{3})*$/;
const PLAIN = /^-?(?:\d+\.?\d*|\.\d+)$/;

export function parseColumnFilterNumber(text: string): number | null {
  const grouped = GROUPED.exec(text);
  const normalised = grouped ? text.split(grouped[1]).join('') : text.replace(',', '.');
  if (!PLAIN.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

export function parseColumnFilterRange(query: string): NumericTest | null {
  const q = query.trim();

  const between = BETWEEN.exec(q);
  if (between) {
    const a = parseColumnFilterNumber(between[1]);
    const b = parseColumnFilterNumber(between[2]);
    if (a == null || b == null) return null;
    const [low, high] = a <= b ? [a, b] : [b, a];
    return (value) => value >= low && value <= high;
  }

  const comparison = COMPARISON.exec(q);
  if (!comparison) return null;
  const bound = parseColumnFilterNumber(comparison[2]);
  if (bound == null) return null;
  switch (comparison[1]) {
    case '>':
      return (value) => value > bound;
    case '<':
      return (value) => value < bound;
    case '>=':
    case '≥':
      return (value) => value >= bound;
    default:
      return (value) => value <= bound;
  }
}

const numericValue = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function filterColumnFilterOptions<T extends { value: string; label: string }>(
  options: readonly T[],
  query: string,
): readonly T[] {
  const q = query.trim();
  if (!q) return options;

  const test = parseColumnFilterRange(q);
  if (test && options.some((option) => numericValue(option.value) != null)) {
    return options.filter((option) => {
      const value = numericValue(option.value);
      return value != null && test(value);
    });
  }

  const lower = q.toLowerCase();
  return options.filter((option) => option.label.toLowerCase().includes(lower));
}
