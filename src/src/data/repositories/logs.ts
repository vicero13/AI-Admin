import {
  LogEntry,
  LogLevel,
  OperationResult,
  Status,
  UUID,
  DateRange,
} from '../../types';

function success<T>(data: T): OperationResult<T> {
  return { status: Status.SUCCESS, data, timestamp: Date.now() };
}

function error<T>(code: string, message: string): OperationResult<T> {
  return {
    status: Status.ERROR,
    error: { code, message },
    timestamp: Date.now(),
  };
}

function generateId(): UUID {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface LogQueryFilters {
  levels?: LogLevel[];
  components?: string[];
  conversationId?: string;
  dateRange?: DateRange;
  limit?: number;
}

const MAX_ENTRIES = 10000;

export class LogRepository {
  private entries: LogEntry[] = [];

  log(entry: Omit<LogEntry, 'logId' | 'timestamp'>): OperationResult<LogEntry> {
    const full: LogEntry = {
      ...entry,
      logId: generateId(),
      timestamp: Date.now(),
    };
    this.entries.push(full);
    this.trimIfNeeded();
    return success({ ...full });
  }

  logMany(entries: Omit<LogEntry, 'logId' | 'timestamp'>[]): OperationResult<number> {
    const now = Date.now();
    for (const entry of entries) {
      this.entries.push({
        ...entry,
        logId: generateId(),
        timestamp: now,
      });
    }
    this.trimIfNeeded();
    return success(entries.length);
  }

  logHandoff(
    handoffId: string,
    conversationId: string,
    message: string,
    details?: string
  ): OperationResult<LogEntry> {
    return this.log({
      level: LogLevel.INFO,
      component: 'handoff',
      message,
      details,
      conversationId,
      handoffId,
    });
  }

  logAIProbing(
    conversationId: string,
    message: string,
    details?: string
  ): OperationResult<LogEntry> {
    return this.log({
      level: LogLevel.WARNING,
      component: 'ai-probing',
      message,
      details,
      conversationId,
    });
  }

  logError(
    component: string,
    message: string,
    errorCode?: string,
    stackTrace?: string,
    conversationId?: string
  ): OperationResult<LogEntry> {
    return this.log({
      level: LogLevel.ERROR,
      component,
      message,
      errorCode,
      stackTrace,
      conversationId,
    });
  }

  query(filters: LogQueryFilters): OperationResult<LogEntry[]> {
    let results = [...this.entries];

    if (filters.levels && filters.levels.length > 0) {
      results = results.filter((e) => filters.levels!.includes(e.level));
    }

    if (filters.components && filters.components.length > 0) {
      results = results.filter((e) => filters.components!.includes(e.component));
    }

    if (filters.conversationId) {
      results = results.filter((e) => e.conversationId === filters.conversationId);
    }

    if (filters.dateRange) {
      const start = filters.dateRange.start.getTime();
      const end = filters.dateRange.end.getTime();
      results = results.filter((e) => e.timestamp >= start && e.timestamp <= end);
    }

    // Return newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit && filters.limit > 0) {
      results = results.slice(0, filters.limit);
    }

    return success(results.map((e) => ({ ...e })));
  }

  deleteOld(beforeTimestamp: number): OperationResult<number> {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp >= beforeTimestamp);
    return success(before - this.entries.length);
  }

  private trimIfNeeded(): void {
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES);
    }
  }
}
