const ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;

function readTriple(num: number, readHundreds: boolean): string {
  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const units = num % 10;
  const parts: string[] = [];

  if (hundreds > 0 || readHundreds) {
    parts.push(ONES[hundreds], 'trăm');
  }

  if (tens > 1) {
    parts.push(ONES[tens], 'mươi');
  } else if (tens === 1) {
    parts.push('mười');
  } else if (units > 0 && (hundreds > 0 || readHundreds)) {
    parts.push('lẻ');
  }

  if (units > 0) {
    if (tens >= 2 && units === 1) {
      parts.push('mốt'); // 21 → "hai mươi mốt"
    } else if (tens >= 1 && units === 5) {
      parts.push('lăm'); // 15 → "mười lăm", 25 → "hai mươi lăm"
    } else {
      parts.push(ONES[units]);
    }
  }

  return parts.join(' ');
}

function scaleWord(i: number): string {
  const base = ['', 'nghìn', 'triệu'][i % 3];
  const billions = Math.floor(i / 3);
  const ty = Array.from({ length: billions }, () => 'tỷ').join(' ');
  return [base, ty].filter(Boolean).join(' ');
}

export function readVietnameseNumber(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'không';

  const triples: number[] = [];
  let x = n;
  while (x > 0) {
    triples.push(x % 1000);
    x = Math.floor(x / 1000);
  }

  const parts: string[] = [];
  for (let i = triples.length - 1; i >= 0; i--) {
    const triple = triples[i];
    if (triple === 0) continue;
    const isMostSignificant = i === triples.length - 1;
    const words = readTriple(triple, !isMostSignificant);
    const scale = scaleWord(i);
    parts.push(scale ? `${words} ${scale}` : words);
  }

  return parts.join(' ');
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function readVietnameseMoney(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  return `${capitalizeFirst(readVietnameseNumber(rounded))} đồng chẵn.`;
}
