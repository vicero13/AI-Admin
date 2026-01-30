import {
  ClientProfile,
  OperationResult,
  Status,
  PlatformType,
  ClientType,
} from '../../types';
import { IClientRepository } from '../interfaces';
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

function rowToClient(row: Record<string, unknown>): ClientProfile {
  return {
    userId: row.user_id as string,
    platform: row.platform as PlatformType,
    name: row.name as string | undefined,
    phoneNumber: row.phone_number as string | undefined,
    email: row.email as string | undefined,
    firstContact: Number(row.first_contact),
    lastContact: Number(row.last_contact),
    totalConversations: Number(row.total_conversations),
    totalMessages: Number(row.total_messages),
    type: row.type as ClientType,
    preferredLanguage: row.preferred_language as ClientProfile['preferredLanguage'],
    communicationStyle: row.communication_style as ClientProfile['communicationStyle'],
    tags: (row.tags as string[]) ?? [],
    previousTopics: (row.previous_topics as string[]) ?? [],
    notes: row.notes as string[] | undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export class PgClientRepository implements IClientRepository {
  constructor(private connection: PgConnection) {}

  async create(client: ClientProfile): Promise<OperationResult<ClientProfile>> {
    try {
      const sql = `
        INSERT INTO clients (user_id, platform, name, phone_number, email, first_contact, last_contact, total_conversations, total_messages, type, preferred_language, communication_style, tags, previous_topics, notes, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      const params = [
        client.userId,
        client.platform,
        client.name ?? null,
        client.phoneNumber ?? null,
        client.email ?? null,
        client.firstContact,
        client.lastContact,
        client.totalConversations,
        client.totalMessages,
        client.type,
        client.preferredLanguage ?? null,
        client.communicationStyle ?? null,
        client.tags,
        client.previousTopics,
        client.notes ?? null,
        JSON.stringify(client.metadata),
      ];
      const result = await this.connection.query(sql, params);
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('CREATE_FAILED', `Failed to create client: ${(err as Error).message}`);
    }
  }

  async get(userId: string): Promise<OperationResult<ClientProfile>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM clients WHERE user_id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to get client: ${(err as Error).message}`);
    }
  }

  async update(userId: string, updates: Partial<ClientProfile>): Promise<OperationResult<ClientProfile>> {
    try {
      const fields: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (updates.platform !== undefined) { fields.push(`platform = $${idx++}`); params.push(updates.platform); }
      if (updates.name !== undefined) { fields.push(`name = $${idx++}`); params.push(updates.name); }
      if (updates.phoneNumber !== undefined) { fields.push(`phone_number = $${idx++}`); params.push(updates.phoneNumber); }
      if (updates.email !== undefined) { fields.push(`email = $${idx++}`); params.push(updates.email); }
      if (updates.firstContact !== undefined) { fields.push(`first_contact = $${idx++}`); params.push(updates.firstContact); }
      if (updates.lastContact !== undefined) { fields.push(`last_contact = $${idx++}`); params.push(updates.lastContact); }
      if (updates.totalConversations !== undefined) { fields.push(`total_conversations = $${idx++}`); params.push(updates.totalConversations); }
      if (updates.totalMessages !== undefined) { fields.push(`total_messages = $${idx++}`); params.push(updates.totalMessages); }
      if (updates.type !== undefined) { fields.push(`type = $${idx++}`); params.push(updates.type); }
      if (updates.preferredLanguage !== undefined) { fields.push(`preferred_language = $${idx++}`); params.push(updates.preferredLanguage); }
      if (updates.communicationStyle !== undefined) { fields.push(`communication_style = $${idx++}`); params.push(updates.communicationStyle); }
      if (updates.tags !== undefined) { fields.push(`tags = $${idx++}`); params.push(updates.tags); }
      if (updates.previousTopics !== undefined) { fields.push(`previous_topics = $${idx++}`); params.push(updates.previousTopics); }
      if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); params.push(updates.notes); }
      if (updates.metadata !== undefined) { fields.push(`metadata = $${idx++}`); params.push(JSON.stringify(updates.metadata)); }

      if (fields.length === 0) {
        return this.get(userId);
      }

      params.push(userId);
      const sql = `UPDATE clients SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`;
      const result = await this.connection.query(sql, params);

      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('UPDATE_FAILED', `Failed to update client: ${(err as Error).message}`);
    }
  }

  async delete(userId: string): Promise<OperationResult<boolean>> {
    try {
      const result = await this.connection.query(
        'DELETE FROM clients WHERE user_id = $1',
        [userId]
      );
      if (result.rowCount === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(true);
    } catch (err) {
      return error('DELETE_FAILED', `Failed to delete client: ${(err as Error).message}`);
    }
  }

  async findByPlatform(platform: PlatformType): Promise<OperationResult<ClientProfile[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM clients WHERE platform = $1 ORDER BY last_contact DESC',
        [platform]
      );
      return success(result.rows.map(rowToClient));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find clients by platform: ${(err as Error).message}`);
    }
  }

  async findByType(type: ClientType): Promise<OperationResult<ClientProfile[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM clients WHERE type = $1 ORDER BY last_contact DESC',
        [type]
      );
      return success(result.rows.map(rowToClient));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find clients by type: ${(err as Error).message}`);
    }
  }

  async findByTags(tags: string[]): Promise<OperationResult<ClientProfile[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM clients WHERE tags && $1 ORDER BY last_contact DESC',
        [tags]
      );
      return success(result.rows.map(rowToClient));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find clients by tags: ${(err as Error).message}`);
    }
  }

  async search(query: string): Promise<OperationResult<ClientProfile[]>> {
    try {
      const pattern = `%${query}%`;
      const sql = `
        SELECT * FROM clients
        WHERE user_id ILIKE $1
           OR name ILIKE $1
           OR email ILIKE $1
           OR phone_number ILIKE $1
           OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE $1)
           OR EXISTS (SELECT 1 FROM unnest(previous_topics) AS t WHERE t ILIKE $1)
        ORDER BY last_contact DESC
      `;
      const result = await this.connection.query(sql, [pattern]);
      return success(result.rows.map(rowToClient));
    } catch (err) {
      return error('SEARCH_FAILED', `Failed to search clients: ${(err as Error).message}`);
    }
  }

  async addTag(userId: string, tag: string): Promise<OperationResult<ClientProfile>> {
    try {
      const sql = `
        UPDATE clients SET tags = array_append(tags, $1)
        WHERE user_id = $2 AND NOT ($1 = ANY(tags))
        RETURNING *
      `;
      const result = await this.connection.query(sql, [tag, userId]);
      if (result.rows.length === 0) {
        // Tag might already exist or user not found; try fetching
        return this.get(userId);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('ADD_TAG_FAILED', `Failed to add tag: ${(err as Error).message}`);
    }
  }

  async removeTag(userId: string, tag: string): Promise<OperationResult<ClientProfile>> {
    try {
      const sql = `
        UPDATE clients SET tags = array_remove(tags, $1)
        WHERE user_id = $2
        RETURNING *
      `;
      const result = await this.connection.query(sql, [tag, userId]);
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('REMOVE_TAG_FAILED', `Failed to remove tag: ${(err as Error).message}`);
    }
  }

  async addNote(userId: string, note: string): Promise<OperationResult<ClientProfile>> {
    try {
      const sql = `
        UPDATE clients SET notes = array_append(COALESCE(notes, ARRAY[]::TEXT[]), $1)
        WHERE user_id = $2
        RETURNING *
      `;
      const result = await this.connection.query(sql, [note, userId]);
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('ADD_NOTE_FAILED', `Failed to add note: ${(err as Error).message}`);
    }
  }

  async updateLastActivity(userId: string): Promise<OperationResult<ClientProfile>> {
    try {
      const result = await this.connection.query(
        'UPDATE clients SET last_contact = $1 WHERE user_id = $2 RETURNING *',
        [Date.now(), userId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Client ${userId} not found`);
      }
      return success(rowToClient(result.rows[0]));
    } catch (err) {
      return error('UPDATE_FAILED', `Failed to update last activity: ${(err as Error).message}`);
    }
  }
}
