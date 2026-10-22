

import { yamlify } from './object';

export type LoggerLevel = 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error';

type InternalLoggerLevel = 'SILENT' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type Logger = {
  trace: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  raw: (message: string, ...args: any[]) => void;
};

const LEVEL_MAP: Record<InternalLoggerLevel, number> = {
  SILENT: -1,
  TRACE: 0,
  DEBUG: 5,
  INFO: 10,
  WARN: 20,
  ERROR: 30,
};

const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const magenta = '\x1b[35m';
const cyan = '\x1b[36m';
const white = '\x1b[37m';

const colors = { red, green, blue, yellow, magenta, cyan, white };
const colorKeys = Object.keys(colors);

function getColor(color?: string): string {
  if (!color) {
    const key = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    return colors[key as keyof typeof colors] ?? '';
  }
  return colors[color as keyof typeof colors] ?? '';
}

function ensureDir(filePath: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
  } catch {
    // ignore — directory may already exist
  }
}

function serializeArg(arg: unknown): string {
  if (arg === null || arg === undefined) return String(arg);
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function createLogger(
  namespace: string,
  options: {
    prettyPrint?: boolean;
    withColor?: boolean;
    color?: string;
    timezone?: string; 
    level?: LoggerLevel;
    skipTimestamp?: boolean;
    logFile?: string; // file path to append logs to
  } = {},
): Logger {
  const color = options.withColor ? getColor(options.color) : '';
  const timezone = options.timezone ?? 'UTC';
  const level: InternalLoggerLevel = (options.level ?? 'INFO').toUpperCase() as InternalLoggerLevel;
  const levelValue = LEVEL_MAP[level];

  const enabled = levelValue > LEVEL_MAP.SILENT;
  const NAMESPACE = namespace.toUpperCase();

  
  const logFile = options.logFile;
  if (logFile) ensureDir(logFile);

  const formatFileArg = options.prettyPrint ? (arg: unknown) => yamlify(arg) : serializeArg;

  const writeToFile = logFile
    ? (prefix: string, message: string, args: any[]) => {
        try {
          const serialized =
            args.length > 0
              ? `${prefix} ${message} ${args.map(formatFileArg).join(' ')}\n`
              : `${prefix} ${message}\n`;
          appendFileSync(logFile, serialized);
        } catch {
          // Silently ignore file write errors to avoid log-loop crashes
        }
      }
    : undefined;

  const log = enabled
    ? (
        level: InternalLoggerLevel,
        method: 'info' | 'warn' | 'error' | 'log',
        message: string,
        ...args: any[]
      ) => {
        if (levelValue > LEVEL_MAP[level]) return;

        const timestamp = new Date().toLocaleString('en-US', {
          timeZone: timezone,
        });
        const prefix = options.skipTimestamp
          ? `[${NAMESPACE}] [${level}]`
          : `[${timestamp}] [${NAMESPACE}] [${level}]`;

        
        const consoleArgs = options.prettyPrint ? args.map(yamlify) : args;
        
        console[method](`${color}${prefix} ${message}`, ...consoleArgs);

        
        if (writeToFile) writeToFile(prefix, message, args);
      }
    : () => {};

  return {
    trace: (message: string, ...args: any[]) => {
      log('TRACE', 'log', message, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      log('DEBUG', 'log', message, ...args);
    },
    info: (message: string, ...args: any[]) => {
      log('INFO', 'info', message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      log('WARN', 'warn', message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      log('ERROR', 'error', message, ...args);
    },
    raw: (message: string, ...args: any[]) => {
      
      console.log(message, ...args);
    },
  };
}

function appendFileSync(_filePath: string, _data: string): void {
  // TODO: implement appendFileSync
}

function mkdirSync(_dirPath: string, _options: { recursive: boolean }): void {
  // TODO: implement mkdirSync
}

function dirname(_path: string): string {
  
  return '';
}
