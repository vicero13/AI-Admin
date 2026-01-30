import { OperationResult, Status } from '../types';
import { ConversationRepository } from './repositories/conversation';
import { ClientRepository } from './repositories/client';
import { HandoffRepository } from './repositories/handoff';
import { LogRepository } from './repositories/logs';
import { KnowledgeRepository } from './repositories/knowledge';
import { IConversationRepository, IClientRepository, IHandoffRepository, ILogRepository } from './interfaces';
import { PgConnection, PgConnectionConfig } from './pg/connection';
import { PgConversationRepository } from './pg/pg-conversation';
import { PgClientRepository } from './pg/pg-client';
import { PgHandoffRepository } from './pg/pg-handoff';
import { PgLogRepository } from './pg/pg-log';
import { runMigrations } from './pg/migrate';

export { ConversationRepository } from './repositories/conversation';
export { ClientRepository } from './repositories/client';
export { HandoffRepository } from './repositories/handoff';
export { LogRepository, LogQueryFilters } from './repositories/logs';
export { KnowledgeRepository, KnowledgeStats } from './repositories/knowledge';
export { IConversationRepository, IClientRepository, IHandoffRepository, ILogRepository } from './interfaces';

export interface DataLayerConfig {
  type: 'memory' | 'postgres';
  postgres?: PgConnectionConfig;
}

export interface HealthStatus {
  healthy: boolean;
  repositories: Record<string, boolean>;
  timestamp: number;
}

export class DataLayer {
  public readonly conversations: IConversationRepository;
  public readonly clients: IClientRepository;
  public readonly handoffs: IHandoffRepository;
  public readonly logs: ILogRepository;
  public readonly knowledge: KnowledgeRepository;

  private pgConnection: PgConnection | null = null;
  private configType: 'memory' | 'postgres';

  constructor(config: DataLayerConfig = { type: 'memory' }) {
    this.configType = config.type;

    if (config.type === 'postgres' && config.postgres) {
      this.pgConnection = new PgConnection(config.postgres);
      this.conversations = new PgConversationRepository(this.pgConnection);
      this.clients = new PgClientRepository(this.pgConnection);
      this.handoffs = new PgHandoffRepository(this.pgConnection);
      this.logs = new PgLogRepository(this.pgConnection);
      console.log('[DataLayer] Using PostgreSQL repositories');
    } else {
      this.conversations = new ConversationRepository() as unknown as IConversationRepository;
      this.clients = new ClientRepository() as unknown as IClientRepository;
      this.handoffs = new HandoffRepository() as unknown as IHandoffRepository;
      this.logs = new LogRepository() as unknown as ILogRepository;
      console.log('[DataLayer] Using in-memory repositories');
    }

    this.knowledge = new KnowledgeRepository();
  }

  async initialize(): Promise<void> {
    if (this.pgConnection) {
      console.log('[DataLayer] Running PostgreSQL migrations...');
      await runMigrations(this.pgConnection);
      console.log('[DataLayer] Migrations completed');
    }
  }

  async healthCheck(): Promise<OperationResult<HealthStatus>> {
    const repositories: Record<string, boolean> = {
      conversations: true,
      clients: true,
      handoffs: true,
      logs: true,
      knowledge: true,
    };

    if (this.pgConnection) {
      try {
        const healthy = await this.pgConnection.healthCheck();
        if (!healthy) {
          repositories.conversations = false;
          repositories.clients = false;
          repositories.handoffs = false;
          repositories.logs = false;
        }
      } catch {
        repositories.conversations = false;
        repositories.clients = false;
        repositories.handoffs = false;
        repositories.logs = false;
      }
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

  async close(): Promise<void> {
    if (this.pgConnection) {
      await this.pgConnection.close();
      console.log('[DataLayer] PostgreSQL connection closed');
    }
  }

  getType(): string {
    return this.configType;
  }
}
