

const PREFIX = '__fake_data_employees_json__.';

export function getManualEmployeesJson(clientCode: string): string {
  if (!clientCode) return '';
  try {
    return localStorage.getItem(`${PREFIX}${clientCode}`) ?? '';
  } catch {
    return '';
  }
}

export function setManualEmployeesJson(clientCode: string, value: string): void {
  if (!clientCode) return;
  const key = `${PREFIX}${clientCode}`;
  try {
    if (value.trim()) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Out of quota etc. — silent; UI will refuse to persist but can still
    // run the seed against in-memory input.
  }
}
