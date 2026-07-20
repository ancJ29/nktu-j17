
export const CONTAINER_NUMBER_PATTERN = /^[A-Z]{3}[UJZ][0-9]{7}$/;

export function normalizeContainerNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidContainerNumber(value: string): boolean {
  const normalized = normalizeContainerNumber(value);
  return normalized === '' || CONTAINER_NUMBER_PATTERN.test(normalized);
}
