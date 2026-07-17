
export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = 30 * ONE_DAY;

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function localeTime(input?: {
  ts?: number | Date;
  locale?: Intl.LocalesArgument;
  
  timezone?: string;
}) {
  return new Date(input?.ts ?? Date.now()).toLocaleString(input?.locale ?? 'en-US', {
    timeZone: input?.timezone ?? 'Asia/Saigon',
  });
}

export function isWeekend(ts: number, timezone: number = 0) {
  
  const date = dateAfterAdjustTimezone(ts, timezone);

  const day = date.getDay();
  return day === 6 || day === 0;
}

export function endOfDay(ts: number, timezone: number = 0) {
  const date = dateAfterAdjustTimezone(ts, timezone);
  
  
  date.setUTCHours(23, 59, 59, 999);

  
  return date.getTime() - timezone * ONE_HOUR;
}

export function getHours(ts: number, timezone: number = 0) {
  const date = dateAfterAdjustTimezone(ts, timezone);
  
  
  return date.getUTCHours();
}

export function formatTime(ts: number, pretty = false) {
  return pretty ? localeTime({ ts }) : ts;
}

export function formatDuration(ts: number, pretty = false) {
  if (!pretty) {
    return ts;
  }
  const seconds = Math.round(ts / 1e3);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (days > 0) {
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${days}d ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getDayOfWeek(ts: number, timezone: string = 'UTC'): number {
  
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(
    ts,
  );
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? -1;
}

function dateAfterAdjustTimezone(ts: number, timezone: number) {
  const date = new Date(ts);
  date.setHours(date.getHours() + timezone);
  return date;
}
