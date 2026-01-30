import { OperationResult, Status } from '../types';
import { ConversationRepository } from './repositories/conversation';
import { ClientRepository } from './repositories/client';
import { HandoffRepository } from './repositories/handoff';
import { LogRepository } from './repositories/logs';
import { KnowledgeRepository } from './repositories/knowledge';

export { ConversationRepository } from './repositories/conversation';
export { ClientRepository } from './repositories/client';
export { HandoffRepository } from './repositories/handoff';
export { LogRepository, LogQueryFilters } from './repositories/logs';
export { KnowledgeRepository, KnowledgeStats } from './repositories/knowledge';

export interface HealthStatus {
  healthy: boolean;
  repositories: Record<string, boolean>;
  timestamp: number;
}

export class DataLayer {
  public readonly conversations: ConversationRepository;
  public readonly clients: ClientRepository;
  public readonly handoffs: HandoffRepository;
  public readonly logs: LogRepository;
  public readonly knowledge: KnowledgeRepository;

  constructor() {
    this.conversations = new ConversationRepository();
    this.clients = new ClientRepository();
    this.handoffs = new HandoffRepository();
    this.logs = new LogRepository();
    this.knowledge = new KnowledgeRepository();
  }

  healthCheck(): OperationResult<HealthStatus> {
    const repositories: Record<string, boolean> = {
      conversations: true,
      clients: true,
      handoffs: true,
      logs: true,
      knowledge: true,
    };

    // Simple validation: try a read operation on each repository
    try {
      this.conversations.findActive();
    } catch {
      repositories.conversations = false;
    }

    try {
      this.handoffs.getPending();
    } catch {
      repositories.handoffs = false;
    }

    try {
      this.knowledge.getStats();
    } catch {
      repositories.knowledge = false;
    }

    const healthy = Object.values(repositories).every(Boolean);

    return {
      status: Status.SUCCESS,
      data: { healthy, repositories, timestamp: Date.now() },
      timestamp: Date.now(),
    };
  }

  cleanup(maxLogAgeMs: number = 7 * 24 * 60 * 60 * 1000, maxIdleConversationMs: number = 24 * 60 * 60 * 1000): OperationResult<{ closedConversations: number; deletedLogs: number }> {
    const now = Date.now();

    const closedResult = this.conversations.closeInactive(maxIdleConversationMs);
    const closedConversations = closedResult.data ?? 0;

    const logsResult = this.logs.deleteOld(now - maxLogAgeMs);
    const deletedLogs = logsResult.data ?? 0;

    return {
      status: Status.SUCCESS,
      data: { closedConversations, deletedLogs },
      timestamp: Date.now(),
    };
  }
}
