export type TranslationTree = Record<string, unknown>;

export type PruneResult = {
  readonly pruned: TranslationTree;

  readonly dropped: readonly string[];
};

function isPlainObject(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pruneShapeChangingOverrides(
  base: TranslationTree,
  overrides: TranslationTree,
  pathPrefix = '',
): PruneResult {
  const pruned: TranslationTree = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(overrides)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    const bundled = base[key];

    if (!(key in base)) {
      pruned[key] = value;
      continue;
    }

    const bundledIsBranch = isPlainObject(bundled);
    const overrideIsBranch = isPlainObject(value);

    if (bundledIsBranch !== overrideIsBranch) {
      dropped.push(path);
      continue;
    }

    if (bundledIsBranch && overrideIsBranch) {
      const child = pruneShapeChangingOverrides(bundled, value, path);

      if (Object.keys(child.pruned).length > 0) pruned[key] = child.pruned;
      dropped.push(...child.dropped);
      continue;
    }

    pruned[key] = value;
  }

  return { pruned, dropped };
}
