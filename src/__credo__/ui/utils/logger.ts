const isLocal = window.location.hostname === 'localhost';
const forceLog = window.localStorage.getItem('__FORCE_LOG__') === 'true';
const shouldLog = isLocal || forceLog;

const COLORS = {
  info: 'green',
  error: 'red',
  warn: 'yellow',
  debug: 'blue',
  trace: 'magenta',
};

const logLevel = window.localStorage.getItem('__LOG_LEVEL__') || 'info';

console.log('logLevel:', logLevel);

const levelValues = {
  error: 4,
  warn: 3,
  info: 2,
  debug: 1,
  trace: 0,
};

const levelValue = levelValues[logLevel as keyof typeof levelValues] - 0.1;

export const logger = Object.freeze({
  info: (...args: unknown[]) => {
    if (!shouldLog) return;
    if (levelValue > levelValues.info) return;
    console.log(`%c[INFO]`, `color: ${COLORS.info};`, ...args);
  },
  error: (...args: unknown[]) => {
    if (!shouldLog) return;
    if (levelValue > levelValues.error) return;
    console.error(`%c[ERROR]`, `color: ${COLORS.error};`, ...args);
  },
  warn: (...args: unknown[]) => {
    if (!shouldLog) return;
    if (levelValue > levelValues.warn) return;
    console.log(`%c[WARN]`, `color: ${COLORS.warn};`, ...args);
  },
  debug: (...args: unknown[]) => {
    if (!shouldLog) return;
    if (levelValue > levelValues.debug) return;
    console.log(`%c[DEBUG]`, `color: ${COLORS.debug};`, ...args);
  },
  trace: (...args: unknown[]) => {
    if (!shouldLog) return;
    if (levelValue > levelValues.trace) return;
    console.log(`%c[TRACE]`, `color: ${COLORS.trace};`, ...args);
  },
});
