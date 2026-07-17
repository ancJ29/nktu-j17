export function toNumber(number: number | string, digits: number = 10): number {
  if (typeof number === 'string') {
    number = parseFloat(number);
  }
  if (Number.isNaN(number)) {
    return 0;
  }
  if (digits <= 0) {
    return Math.round(number);
  }
  return Number(number.toFixed(digits));
}
