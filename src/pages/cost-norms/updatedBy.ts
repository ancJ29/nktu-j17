export type CostNormAuditStamp = {
  userId?: string;
  userName?: string;
};

export function readUpdatedByName(extra: CostNormAuditStamp | undefined): string {
  return extra?.userName?.trim() ?? '';
}

export function buildUpdatedByStamp(
  employeeStamp: CostNormAuditStamp,
  profile: { name?: string | undefined; email?: string | undefined } | undefined,
): CostNormAuditStamp {
  if (employeeStamp.userName?.trim()) return employeeStamp;

  const fallback = profile?.name?.trim() || profile?.email?.trim() || '';
  if (!fallback) return employeeStamp;
  return { ...employeeStamp, userName: fallback };
}
