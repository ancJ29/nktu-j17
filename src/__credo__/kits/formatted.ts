/**
 * Format the given date as a date
 * @param value - The date to format
 * @param options - The options for the date format
 * @returns The formatted date
 */
export function formatLocaleDate(
  value: number | Date | string,
  options?: {
    format?: 'VN-d/m/y' | 'VN-d/m';
  },
): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return '-';
  }
  const year = d.getFullYear().toString().padStart(4, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  const format = options?.format;
  if (format && format.startsWith('VN-')) {
    switch (format) {
      case 'VN-d/m/y':
        return `${day}/${month}/${year}`;
      case 'VN-d/m':
        return `${day}/${month}`;
      default:
        return 'Invalid format';
    }
  }
  return `${year}-${month}-${day}`;
}

/**
 * Format the given date and time as a date and time
 * @param value - The date and time to format
 * @param options - The options for the date and time format
 * @returns The formatted date and time
 */
export function formatLocaleDateTime(
  value: number | Date | string,
  options?: {
    format?: 'VN-h:m d/m' | 'VN-h:m d/m/y' | 'VN-d/m h:m';
  },
): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return '-';
  }
  const year = d.getFullYear().toString().padStart(4, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const format = options?.format;
  if (format && format.startsWith('VN-')) {
    switch (format) {
      case 'VN-h:m d/m':
        return `${hours}:${minutes} ${day}/${month}`;
      case 'VN-h:m d/m/y':
        return `${hours}:${minutes} ${day}/${month}/${year}`;
      case 'VN-d/m h:m':
        return `${day}/${month} ${hours}:${minutes}`;
      default:
        return 'Invalid format';
    }
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format the given phone number as a phone number
 * @param value - The phone number to format
 * @returns The formatted phone number
 */
export function formatPhoneNumber(value: string): string {
  if (value.startsWith('09')) {
    // '0901234456' → '0901-234-456'
    return value.replace(/(\d{4})(\d{3})(\d+)/, '$1-$2-$3');
  }

  if (value.startsWith('02')) {
    // '02312345678' → '023-1234-5678'
    return value.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
  }

  // return phoneNumber.replace('+84', '0').replace(/(\d{4})(\d{3})(\d+)/, '$1-$2-$3');
  return value;
}
