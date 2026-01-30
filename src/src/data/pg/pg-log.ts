import {
  LogEntry,
  LogLevel,
  OperationResult,
  Status,
  UUID,
} from '../../types';
import { ILogRepository } from '../interfaces';
import { LogQueryFilters } from '../repositories/logs';
import { PgConnection } from './connection';

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

function rowToLogEntry(row: Record<string, unknown>): LogEntry {
  return {
    logId: row.log_id as string,
    timestamp: Number(row.timestamp),
    level: row.level as LogLevel,
    component: row.component as string,
    message: row.message as string,
    details: row.details as string | undefined,
    conversationId: row.conversation_id as string | undefined,
    userId: row.user_id as string | undefined,
    handoffId: row.handoff_id as string | undefined,
    stackTrace: row.stack_trace as string | undefined,
    errorCode: row.error_code as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  };
}

export class PgLogRepository implements ILogRepository {
  constructor(private connection: PgConnection) {}

  async log(entry: Omit<LogEntry, 'logId' | 'timestamp'>): Promise<OperationResult<LogEntry>> {
    try {
      const logId = generateId();
      const timestamp = Date.now();
      const sql = `
        INSERT INTO logs (log_id, timestamp, level, component, message, details, conversation_id, user_id, handoff_id, stack_trace, error_code, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const params = [
        logId,
        timestamp,
        entry.level,
        entry.component,
        entry.message,
        entry.details ?? null,
        entry.conversationId ?? null,
        entry.userId ?? null,
        entry.handoffId ?? null,
        entry.stackTrace ?? null,
        entry.errorCode ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ];
      const result = await this.connection.query(sql, params);
      return success(rowToLogEntry(result.rows[0]));
    } catch (err) {
      return error('LOG_FAILED', `Failed to log entry: ${(err as Error).message}`);
    }
  }

  async logMany(entries: Omit<LogEntry, 'logId' | 'timestamp'>[]): Promise<OperationResult<number>> {
    try {
      const now = Date.now();
      const values: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const entry of entries) {
        const logId = generateId();
        values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        params.push(
          logId,
          now,
          entry.level,
          entry.component,
          entry.message,
          entry.details ?? null,
          entry.conversationId ?? null,
          entry.userId ?? null,
          entry.handoffId ?? null,
          entry.stackTrace ?? null,
          entry.errorCode ?? null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
        );
      }

      if (values.length === 0) {
        return success(0);
      }

      const sql = `
        INSERT INTO logs (log_id, timestamp, level, component, message, details, conversation_id, user_id, handoff_id, stack_trace, error_code, metadata)
        VALUES ${values.join(', ')}
      `;
      await this.connection.query(sql, params);
      return success(entries.length);
    } catch (err) {
      return error('LOG_MANY_FAILED', `Failed to log entries: ${(err as Error).message}`);
    }
  }

  async logHandoff(
    handoffId: string,
    conversationId: string,
    message: string,
    details?: string
  ): Promise<OperationResult<LogEntry>> {
    return this.log({
      level: LogLevel.INFO,
      component: 'handoff',
      message,
      details,
      conversationId,
      handoffId,
    });
  }

  async logAIProbing(
    conversationId: string,
    message: string,
    details?: string
  ): Promise<OperationResult<LogEntry>> {
    return this.log({
      level: LogLevel.WARNING,
      component: 'ai-probing',
      message,
      details,
      conversationId,
    });
  }

  async logError(
    component: string,
    message: string,
    errorCode?: string,
    stackTrace?: string,
    conversationId?: string
  ): Promise<OperationResult<LogEntry>> {
    return this.log({
      level: LogLevel.ERROR,
      component,
      message,
      errorCode,
      stackTrace,
      conversationId,
    });
  }

  async query(filters: LogQueryFilters): Promise<OperationResult<LogEntry[]>> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (filters.levels && filters.levels.length > 0) {
        conditions.push(`level = ANY($${idx++})`);
        params.push(filters.levels);
      }

      if (filters.components && filters.components.length > 0) {
        conditions.push(`component = ANY($${idx++})`);
        params.push(filters.components);
      }

      if (filters.conversationId) {
        conditions.push(`conversation_id = $${idx++}`);
        params.push(filters.conversationId);
      }

      if (filters.dateRange) {
        const start = filters.dateRange.start.getTime();
        const end = filters.dateRange.end.getTime();
        conditions.push(`timestamp >= $${idx++}`);
        params.push(start);
        conditions.push(`timestamp <= $${idx++}`);
        params.push(end);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters.limit && filters.limit > 0 ? `LIMIT $${idx++}` : '';
      if (filters.limit && filters.limit > 0) {
        params.push(filters.limit);
      }

      const sql = `SELECT * FROM logs ${where} ORDER BY timestamp DESC ${limit}`;
      const result = await this.connection.query(sql, params);
      return success(result.rows.map(rowToLogEntry));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to query logs: ${(err as Error).message}`);
    }
  }

  async deleteOld(beforeTimestamp: number): Promise<OperationResult<number>> {
    try {
      const result = await this.connection.query(
        'DELETE FROM logs WHERE timestamp < $1',
        [beforeTimestamp]
      );
      return success(result.rowCount ?? 0);
    } catch (err) {
      return error('DELETE_FAILED', `Failed to delete old logs: ${(err as Error).message}`);
    }
  }
}
