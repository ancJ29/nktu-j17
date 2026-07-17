export function formatNumber(
  number: number,
  options: {
    prefix?: string;
    suffix?: string;
    precision?: number;
    style?: Intl.NumberFormatOptions['style'];
  },
): string {
  if (!number) {
    return '-';
  }
  if (options.precision) {
    number = Number(number.toFixed(options.precision));
  }

  let res = number.toLocaleString('en-US', {
    style: options.style,
  });

  if (options.suffix) {
    res = res + options.suffix;
  }

  if (options.prefix) {
    res = options.prefix + res;
  }

  return res;
}

export function shortenString(string: string, maxLength: number) {
  if (string.length <= maxLength) {
    return string;
  }
  const midLength = Math.floor(maxLength / 2);
  return string.slice(0, midLength) + '...' + string.slice(-midLength);
}

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};
