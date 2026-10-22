

export const AUTO_LOGIN_DOMAIN = 'auto.local';

export function codeToLoginEmail(code: string): string {
  return `${code.trim().toLowerCase()}@${AUTO_LOGIN_DOMAIN}`;
}

export function isAutoLoginEmail(email: string): boolean {
  return email.includes(AUTO_LOGIN_DOMAIN);
}

export function resolveLoginIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed || trimmed.includes('@')) return trimmed;
  return codeToLoginEmail(trimmed);
}

export function findEmployeeByLoginEmail<
  T extends { email?: string; extra?: { loginEmail?: string } },
>(employees: readonly T[], loginEmail: string | undefined | null): T | undefined {
  if (!loginEmail) return undefined;
  return employees.find((e) => (e.email || e.extra?.loginEmail) === loginEmail);
}
