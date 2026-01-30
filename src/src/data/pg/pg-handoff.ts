import {
  Handoff,
  HandoffStatus,
  HandoffPriority,
  HandoffStats,
  HandoffResolution,
  DateRange,
  OperationResult,
  Status,
  UUID,
} from '../../types';
import { IHandoffRepository } from '../interfaces';
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

function rowToHandoff(row: Record<string, unknown>): Handoff {
  return {
    handoffId: row.handoff_id as string,
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    reason: row.reason as Handoff['reason'],
    context: row.context as Handoff['context'],
    initiatedAt: Number(row.initiated_at),
    notifiedAt: row.notified_at != null ? Number(row.notified_at) : undefined,
    acceptedAt: row.accepted_at != null ? Number(row.accepted_at) : undefined,
    resolvedAt: row.resolved_at != null ? Number(row.resolved_at) : undefined,
    assignedTo: row.assigned_to as string | undefined,
    acceptedBy: row.accepted_by as string | undefined,
    status: row.status as HandoffStatus,
    priority: row.priority as HandoffPriority,
    resolution: row.resolution as HandoffResolution | undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export class PgHandoffRepository implements IHandoffRepository {
  constructor(private connection: PgConnection) {}

  async create(handoff: Handoff): Promise<OperationResult<Handoff>> {
    try {
      const sql = `
        INSERT INTO handoffs (handoff_id, conversation_id, user_id, reason, context, initiated_at, notified_at, accepted_at, resolved_at, assigned_to, accepted_by, status, priority, resolution, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      const params = [
        handoff.handoffId,
        handoff.conversationId,
        handoff.userId,
        JSON.stringify(handoff.reason),
        JSON.stringify(handoff.context),
        handoff.initiatedAt,
        handoff.notifiedAt ?? null,
        handoff.acceptedAt ?? null,
        handoff.resolvedAt ?? null,
        handoff.assignedTo ?? null,
        handoff.acceptedBy ?? null,
        handoff.status,
        handoff.priority,
        handoff.resolution ? JSON.stringify(handoff.resolution) : null,
        JSON.stringify(handoff.metadata),
      ];
      const result = await this.connection.query(sql, params);
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('CREATE_FAILED', `Failed to create handoff: ${(err as Error).message}`);
    }
  }

  async get(handoffId: UUID): Promise<OperationResult<Handoff>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE handoff_id = $1',
        [handoffId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to get handoff: ${(err as Error).message}`);
    }
  }

  async update(handoffId: UUID, updates: Partial<Handoff>): Promise<OperationResult<Handoff>> {
    try {
      const fields: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (updates.conversationId !== undefined) { fields.push(`conversation_id = $${idx++}`); params.push(updates.conversationId); }
      if (updates.userId !== undefined) { fields.push(`user_id = $${idx++}`); params.push(updates.userId); }
      if (updates.reason !== undefined) { fields.push(`reason = $${idx++}`); params.push(JSON.stringify(updates.reason)); }
      if (updates.context !== undefined) { fields.push(`context = $${idx++}`); params.push(JSON.stringify(updates.context)); }
      if (updates.initiatedAt !== undefined) { fields.push(`initiated_at = $${idx++}`); params.push(updates.initiatedAt); }
      if (updates.notifiedAt !== undefined) { fields.push(`notified_at = $${idx++}`); params.push(updates.notifiedAt); }
      if (updates.acceptedAt !== undefined) { fields.push(`accepted_at = $${idx++}`); params.push(updates.acceptedAt); }
      if (updates.resolvedAt !== undefined) { fields.push(`resolved_at = $${idx++}`); params.push(updates.resolvedAt); }
      if (updates.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); params.push(updates.assignedTo); }
      if (updates.acceptedBy !== undefined) { fields.push(`accepted_by = $${idx++}`); params.push(updates.acceptedBy); }
      if (updates.status !== undefined) { fields.push(`status = $${idx++}`); params.push(updates.status); }
      if (updates.priority !== undefined) { fields.push(`priority = $${idx++}`); params.push(updates.priority); }
      if (updates.resolution !== undefined) { fields.push(`resolution = $${idx++}`); params.push(JSON.stringify(updates.resolution)); }
      if (updates.metadata !== undefined) { fields.push(`metadata = $${idx++}`); params.push(JSON.stringify(updates.metadata)); }

      if (fields.length === 0) {
        return this.get(handoffId);
      }

      params.push(handoffId);
      const sql = `UPDATE handoffs SET ${fields.join(', ')} WHERE handoff_id = $${idx} RETURNING *`;
      const result = await this.connection.query(sql, params);

      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('UPDATE_FAILED', `Failed to update handoff: ${(err as Error).message}`);
    }
  }

  async delete(handoffId: UUID): Promise<OperationResult<boolean>> {
    try {
      const result = await this.connection.query(
        'DELETE FROM handoffs WHERE handoff_id = $1',
        [handoffId]
      );
      if (result.rowCount === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(true);
    } catch (err) {
      return error('DELETE_FAILED', `Failed to delete handoff: ${(err as Error).message}`);
    }
  }

  async findByConversation(conversationId: string): Promise<OperationResult<Handoff[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE conversation_id = $1 ORDER BY initiated_at DESC',
        [conversationId]
      );
      return success(result.rows.map(rowToHandoff));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find handoffs by conversation: ${(err as Error).message}`);
    }
  }

  async findByManager(managerId: string): Promise<OperationResult<Handoff[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE assigned_to = $1 OR accepted_by = $1 ORDER BY initiated_at DESC',
        [managerId]
      );
      return success(result.rows.map(rowToHandoff));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find handoffs by manager: ${(err as Error).message}`);
    }
  }

  async findByStatus(status: HandoffStatus): Promise<OperationResult<Handoff[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE status = $1 ORDER BY initiated_at DESC',
        [status]
      );
      return success(result.rows.map(rowToHandoff));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find handoffs by status: ${(err as Error).message}`);
    }
  }

  async findByPriority(priority: HandoffPriority): Promise<OperationResult<Handoff[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE priority = $1 ORDER BY initiated_at DESC',
        [priority]
      );
      return success(result.rows.map(rowToHandoff));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find handoffs by priority: ${(err as Error).message}`);
    }
  }

  async getPending(): Promise<OperationResult<Handoff[]>> {
    try {
      const result = await this.connection.query(
        "SELECT * FROM handoffs WHERE status IN ('pending', 'notified') ORDER BY initiated_at ASC"
      );
      return success(result.rows.map(rowToHandoff));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to get pending handoffs: ${(err as Error).message}`);
    }
  }

  async assign(handoffId: UUID, managerId: string): Promise<OperationResult<Handoff>> {
    try {
      const now = Date.now();
      const result = await this.connection.query(
        "UPDATE handoffs SET assigned_to = $1, status = 'notified', notified_at = $2 WHERE handoff_id = $3 RETURNING *",
        [managerId, now, handoffId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('ASSIGN_FAILED', `Failed to assign handoff: ${(err as Error).message}`);
    }
  }

  async accept(handoffId: UUID, managerId: string): Promise<OperationResult<Handoff>> {
    try {
      const now = Date.now();
      const result = await this.connection.query(
        "UPDATE handoffs SET accepted_by = $1, status = 'accepted', accepted_at = $2 WHERE handoff_id = $3 RETURNING *",
        [managerId, now, handoffId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('ACCEPT_FAILED', `Failed to accept handoff: ${(err as Error).message}`);
    }
  }

  async resolve(handoffId: UUID, resolution: HandoffResolution): Promise<OperationResult<Handoff>> {
    try {
      const now = Date.now();
      const result = await this.connection.query(
        "UPDATE handoffs SET status = 'resolved', resolved_at = $1, resolution = $2 WHERE handoff_id = $3 RETURNING *",
        [now, JSON.stringify(resolution), handoffId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Handoff ${handoffId} not found`);
      }
      return success(rowToHandoff(result.rows[0]));
    } catch (err) {
      return error('RESOLVE_FAILED', `Failed to resolve handoff: ${(err as Error).message}`);
    }
  }

  async getStats(range: DateRange): Promise<OperationResult<HandoffStats>> {
    try {
      const start = range.start.getTime();
      const end = range.end.getTime();

      // Get all handoffs in range for aggregation
      const result = await this.connection.query(
        'SELECT * FROM handoffs WHERE initiated_at >= $1 AND initiated_at <= $2',
        [start, end]
      );

      const rows = result.rows.map(rowToHandoff);

      const byStatus: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      let totalResponseTime = 0;
      let responseCount = 0;
      let totalResolutionTime = 0;
      let resolutionCount = 0;
      let resolvedSuccessfully = 0;
      let returnedToAI = 0;

      for (const h of rows) {
        byStatus[h.status] = (byStatus[h.status] ?? 0) + 1;
        byReason[h.reason.type] = (byReason[h.reason.type] ?? 0) + 1;
        byPriority[h.priority] = (byPriority[h.priority] ?? 0) + 1;

        if (h.acceptedAt && h.notifiedAt) {
          totalResponseTime += h.acceptedAt - h.notifiedAt;
          responseCount++;
        }
        if (h.resolvedAt && h.initiatedAt) {
          totalResolutionTime += h.resolvedAt - h.initiatedAt;
          resolutionCount++;
        }
        if (h.resolution) {
          if (h.resolution.status === 'resolved_successfully') {
            resolvedSuccessfully++;
          }
          if (h.resolution.returnToAI) {
            returnedToAI++;
          }
        }
      }

      const stats: HandoffStats = {
        period: range,
        total: rows.length,
        byStatus,
        byReason,
        byPriority,
        averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
        averageResolutionTime: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
        resolvedSuccessfully,
        returnedToAI,
      };

      return success(stats);
    } catch (err) {
      return error('STATS_FAILED', `Failed to get handoff stats: ${(err as Error).message}`);
    }
  }
}
