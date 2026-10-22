export function carryUnmodelledKeys<T extends Record<string, unknown>>(
  stored: Record<string, unknown> | null,
  built: T,
): T {
  if (!stored) return built;
  return { ...stored, ...built };
}
