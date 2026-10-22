export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return false;

  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
