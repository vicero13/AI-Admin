import { Pool, PoolConfig, QueryResult } from 'pg';

export interface PgConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export class PgConnection {
  private pool: Pool;

  constructor(config: PgConnectionConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections ?? 10,
      idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 5000,
    };
    this.pool = new Pool(poolConfig);
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 AS ok');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }
}
