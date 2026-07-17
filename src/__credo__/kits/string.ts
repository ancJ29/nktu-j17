
export function randomString(length: number = 10, timeBased: boolean = false) {
  const rnd = Math.random()
    .toString(36)
    .substring(2, length + 2);

  if (timeBased) {
    return `${Date.now()
      .toString(36)
      .substring(2, length + 2)}-${rnd}`;
  }

  return rnd;
}

export function generateId(mark = 0) {
  const ts = (Date.now() - mark).toString(36);

  const randomBuffer = new Uint8Array(10);
  
  crypto.getRandomValues(randomBuffer);

  let rand = '';
  for (let i = 0; i < randomBuffer.length; i++) {
    rand += (randomBuffer[i]! % 36).toString(36);
  }

  return `${ts}-${rand}`;
}

export function newVersion(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function maskString(data: string) {
  if (data.length < 9) {
    return '*'.repeat(data.length);
  }
  return data.slice(0, 3) + '*'.repeat(data.length - 8) + data.slice(-3);
}

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIALS = '@$!%*?&';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SPECIALS;

function randomInt(max: number): number {
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return value % max;
}

function pickRandom(chars: string): string {
  return chars[randomInt(chars.length)]!;
}

export function generatePassword(length: number = 16): string {
  const len = Math.max(length, 8);

  
  const required = [
    pickRandom(LOWERCASE),
    pickRandom(UPPERCASE),
    pickRandom(DIGITS),
    pickRandom(SPECIALS),
  ];

  
  for (let i = required.length; i < len; i++) {
    required.push(pickRandom(ALL_CHARS));
  }

  
  
  for (let i = required.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [required[i], required[j]] = [required[j]!, required[i]!];
  }

  return required.join('');
}
