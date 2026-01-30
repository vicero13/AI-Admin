import {
  Handoff,
  HandoffStatus,
  HandoffPriority,
  HandoffStats,
  DateRange,
  OperationResult,
  Status,
  UUID,
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

export class HandoffRepository {
  private handoffs = new Map<UUID, Handoff>();

  create(handoff: Handoff): OperationResult<Handoff> {
    if (this.handoffs.has(handoff.handoffId)) {
      return error('DUPLICATE', `Handoff ${handoff.handoffId} already exists`);
    }
    this.handoffs.set(handoff.handoffId, { ...handoff });
    return success({ ...handoff });
  }

  get(handoffId: UUID): OperationResult<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    return success({ ...handoff });
  }

  update(handoffId: UUID, updates: Partial<Handoff>): OperationResult<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    const updated: Handoff = {
      ...handoff,
      ...updates,
      handoffId: handoff.handoffId,
    };
    this.handoffs.set(handoffId, updated);
    return success({ ...updated });
  }

  delete(handoffId: UUID): OperationResult<boolean> {
    if (!this.handoffs.has(handoffId)) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    this.handoffs.delete(handoffId);
    return success(true);
  }

  findByConversation(conversationId: string): OperationResult<Handoff[]> {
    const results = Array.from(this.handoffs.values()).filter(
      (h) => h.conversationId === conversationId
    );
    return success(results.map((h) => ({ ...h })));
  }

  findByManager(managerId: string): OperationResult<Handoff[]> {
    const results = Array.from(this.handoffs.values()).filter(
      (h) => h.assignedTo === managerId || h.acceptedBy === managerId
    );
    return success(results.map((h) => ({ ...h })));
  }

  findByStatus(status: HandoffStatus): OperationResult<Handoff[]> {
    const results = Array.from(this.handoffs.values()).filter(
      (h) => h.status === status
    );
    return success(results.map((h) => ({ ...h })));
  }

  findByPriority(priority: HandoffPriority): OperationResult<Handoff[]> {
    const results = Array.from(this.handoffs.values()).filter(
      (h) => h.priority === priority
    );
    return success(results.map((h) => ({ ...h })));
  }

  getPending(): OperationResult<Handoff[]> {
    const results = Array.from(this.handoffs.values()).filter(
      (h) =>
        h.status === HandoffStatus.PENDING || h.status === HandoffStatus.NOTIFIED
    );
    return success(results.map((h) => ({ ...h })));
  }

  assign(handoffId: UUID, managerId: string): OperationResult<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    handoff.assignedTo = managerId;
    handoff.status = HandoffStatus.NOTIFIED;
    handoff.notifiedAt = Date.now();
    return success({ ...handoff });
  }

  accept(handoffId: UUID, managerId: string): OperationResult<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    handoff.acceptedBy = managerId;
    handoff.status = HandoffStatus.ACCEPTED;
    handoff.acceptedAt = Date.now();
    return success({ ...handoff });
  }

  resolve(handoffId: UUID, resolution: Handoff['resolution']): OperationResult<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      return error('NOT_FOUND', `Handoff ${handoffId} not found`);
    }
    handoff.status = HandoffStatus.RESOLVED;
    handoff.resolvedAt = Date.now();
    handoff.resolution = resolution;
    return success({ ...handoff });
  }

  getStats(range: DateRange): OperationResult<HandoffStats> {
    const start = range.start.getTime();
    const end = range.end.getTime();

    const inRange = Array.from(this.handoffs.values()).filter(
      (h) => h.initiatedAt >= start && h.initiatedAt <= end
    );

    const byStatus: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    let resolvedSuccessfully = 0;
    let returnedToAI = 0;

    for (const h of inRange) {
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
      total: inRange.length,
      byStatus,
      byReason,
      byPriority,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      averageResolutionTime: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      resolvedSuccessfully,
      returnedToAI,
    };

    return success(stats);
  }
}
