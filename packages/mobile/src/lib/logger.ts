import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'ideafuel_logs';
const MAX_ENTRIES = 200;
const FLUSH_INTERVAL = 10_000; // 10s

let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let loaded = false;

function createEntry(
  level: LogLevel,
  category: string,
  message: string,
  meta?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    category,
    message: message.slice(0, 500),
    meta,
  };
}

function push(entry: LogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer = buffer.slice(-MAX_ENTRIES);
  }
}

// ── Public API ──

export const logger = {
  info(category: string, message: string, meta?: Record<string, unknown>) {
    push(createEntry('info', category, message, meta));
  },

  warn(category: string, message: string, meta?: Record<string, unknown>) {
    push(createEntry('warn', category, message, meta));
  },

  error(category: string, message: string, meta?: Record<string, unknown>) {
    push(createEntry('error', category, message, meta));
    // Flush immediately on errors
    flush();
  },

  fatal(category: string, message: string, meta?: Record<string, unknown>) {
    push(createEntry('fatal', category, message, meta));
    flush();
  },

  /** Get all stored log entries. */
  getEntries(): LogEntry[] {
    return [...buffer];
  },

  /** Get entries filtered by level. */
  getErrors(): LogEntry[] {
    return buffer.filter((e) => e.level === 'error' || e.level === 'fatal');
  },

  /** Format logs as a shareable string. */
  formatForShare(): string {
    if (buffer.length === 0) return '(no logs captured)';

    return buffer
      .map((e) => {
        const ts = e.timestamp.slice(11, 23); // HH:mm:ss.SSS
        const tag = e.level.toUpperCase().padEnd(5);
        const meta = e.meta ? ` ${JSON.stringify(e.meta)}` : '';
        return `${ts} [${tag}] ${e.category}: ${e.message}${meta}`;
      })
      .join('\n');
  },

  /** Clear all logs. */
  clear() {
    buffer = [];
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  /** Number of stored entries. */
  get count() {
    return buffer.length;
  },

  /** Number of errors. */
  get errorCount() {
    return buffer.filter((e) => e.level === 'error' || e.level === 'fatal').length;
  },
};

// ── Persistence ──

async function flush() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable — drop silently
  }
}

export async function initLogger() {
  if (loaded) return;
  loaded = true;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LogEntry[];
      buffer = parsed.slice(-MAX_ENTRIES);
    }
  } catch {
    // Corrupted — start fresh
  }

  logger.info('app', 'Logger initialized');

  // Periodic flush
  flushTimer = setInterval(flush, FLUSH_INTERVAL);
}

// ── Global error capture ──

export function installGlobalHandlers() {
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const level = isFatal ? 'fatal' : 'error';
    logger[level]('crash', error.message, {
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    // Call original handler so RN still shows the red screen in dev
    originalHandler(error, isFatal);
  });

  // Unhandled promise rejections (RN 0.81+ uses global handler)
  if (typeof globalThis !== 'undefined') {
    const orig = globalThis.onunhandledrejection;
    globalThis.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const error = event?.reason;
      logger.error('promise', error?.message ?? 'Unhandled promise rejection', {
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      });
      if (typeof orig === 'function') orig(event);
    };
  }
}
