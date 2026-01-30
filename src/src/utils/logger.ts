import winston from 'winston';
import { LogLevel, LogEntry, UUID, Timestamp } from '../types';

export interface LogContext {
  component: string;
  conversationId?: string;
  userId?: string;
  handoffId?: string;
  [key: string]: unknown;
}

const LOG_LEVEL_MAP: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARNING]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.CRITICAL]: 'error',
};

const winstonLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const component = meta.component ? `[${meta.component}]` : '';
          const convId = meta.conversationId ? ` conv=${meta.conversationId}` : '';
          const uid = meta.userId ? ` user=${meta.userId}` : '';
          const hid = meta.handoffId ? ` handoff=${meta.handoffId}` : '';
          const context = `${convId}${uid}${hid}`.trim();
          const contextStr = context ? ` (${context})` : '';
          return `${timestamp} ${level} ${component}${contextStr}: ${message}`;
        }),
      ),
    }),
  ],
});

export class Logger {
  private context: LogContext;

  constructor(context: LogContext) {
    this.context = context;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARNING, message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  critical(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.CRITICAL, message, { ...meta, critical: true });
  }

  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  setContext(updates: Partial<LogContext>): void {
    Object.assign(this.context, updates);
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const winstonLevel = LOG_LEVEL_MAP[level];
    const logData: Record<string, unknown> = {
      ...this.context,
      ...meta,
    };

    winstonLogger.log(winstonLevel, message, logData);
  }
}

export function setLogLevel(level: LogLevel): void {
  winstonLogger.level = LOG_LEVEL_MAP[level];
}

export function addFileTransport(filename: string, level?: LogLevel): void {
  winstonLogger.add(
    new winston.transports.File({
      filename,
      level: level ? LOG_LEVEL_MAP[level] : undefined,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
}

export const logger = new Logger({ component: 'app' });

export default logger;
