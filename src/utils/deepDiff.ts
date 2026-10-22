

export type FieldDiff = {
  
  readonly from?: unknown;
  
  readonly to?: unknown;
};

export type DeepDiff = Record<string, FieldDiff>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  if (v instanceof Date) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    
    
    
    
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function makeFieldDiff(before: unknown, after: unknown): FieldDiff {
  const out: { from?: unknown; to?: unknown } = {};
  if (before !== undefined) out.from = before;
  if (after !== undefined) out.to = after;
  return out;
}

export function deepDiff(before: unknown, after: unknown, prefix = ''): DeepDiff {
  if (structurallyEqual(before, after)) return {};
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return { [prefix || '$']: makeFieldDiff(before, after) };
  }
  const out: DeepDiff = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const path = prefix ? `${prefix}.${k}` : k;
    const bv = before[k];
    const av = after[k];
    if (structurallyEqual(bv, av)) continue;
    if (isPlainObject(bv) && isPlainObject(av)) {
      Object.assign(out, deepDiff(bv, av, path));
    } else {
      out[path] = makeFieldDiff(bv, av);
    }
  }
  return out;
}
