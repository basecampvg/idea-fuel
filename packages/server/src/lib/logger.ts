/**
 * Structured Logger
 * Environment-aware logging with levels and formatting
 */

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[logLevel as LogLevel];
}

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

/**
 * Create a logger instance for a specific context
 * @param context - Module or service name (e.g., 'ResearchWorker', 'SparkAI')
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', context, message, data));
      }
    },
    info: (message: string, data?: unknown) => {
      if (shouldLog('info')) {
        console.log(formatMessage('info', context, message, data));
      }
    },
    warn: (message: string, data?: unknown) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message, data));
      }
    },
    error: (message: string, error?: unknown) => {
      if (shouldLog('error')) {
        const errorData = error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error;
        console.error(formatMessage('error', context, message, errorData));
      }
    },
  };
}

/**
 * Default logger for quick use
 */
export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },
  info: (message: string, data?: unknown) => {
    if (shouldLog('info')) {
      console.log(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  },
  warn: (message: string, data?: unknown) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  },
  error: (message: string, error?: unknown) => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
    }
  },
};

export default logger;
