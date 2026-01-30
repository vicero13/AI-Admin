import {
  Conversation,
  ContextMessage,
  OperationResult,
  Status,
  PlatformType,
  UUID,
} from '../../types';
import { IConversationRepository } from '../interfaces';
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

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    platform: row.platform as PlatformType,
    context: (row.context ?? {}) as Conversation['context'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    lastMessageAt: Number(row.last_message_at),
    closedAt: row.closed_at != null ? Number(row.closed_at) : undefined,
    active: row.active as boolean,
    mode: row.mode as Conversation['mode'],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function rowToMessage(row: Record<string, unknown>): ContextMessage {
  return {
    messageId: row.message_id as string,
    timestamp: Number(row.timestamp),
    role: row.role as ContextMessage['role'],
    content: row.content as string,
    intent: row.intent as string | undefined,
    emotion: row.emotion as string | undefined,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    handledBy: row.handled_by as ContextMessage['handledBy'],
    metadata: row.metadata as Record<string, unknown> | undefined,
  };
}

export class PgConversationRepository implements IConversationRepository {
  constructor(private connection: PgConnection) {}

  async create(conversation: Conversation): Promise<OperationResult<Conversation>> {
    try {
      const sql = `
        INSERT INTO conversations (conversation_id, user_id, platform, created_at, updated_at, last_message_at, closed_at, active, mode, context, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const params = [
        conversation.conversationId,
        conversation.userId,
        conversation.platform,
        conversation.createdAt,
        conversation.updatedAt,
        conversation.lastMessageAt,
        conversation.closedAt ?? null,
        conversation.active,
        conversation.mode,
        JSON.stringify(conversation.context),
        JSON.stringify(conversation.metadata),
      ];
      const result = await this.connection.query(sql, params);
      return success(rowToConversation(result.rows[0]));
    } catch (err) {
      return error('CREATE_FAILED', `Failed to create conversation: ${(err as Error).message}`);
    }
  }

  async get(conversationId: UUID): Promise<OperationResult<Conversation>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM conversations WHERE conversation_id = $1',
        [conversationId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Conversation ${conversationId} not found`);
      }
      return success(rowToConversation(result.rows[0]));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to get conversation: ${(err as Error).message}`);
    }
  }

  async update(conversationId: UUID, updates: Partial<Conversation>): Promise<OperationResult<Conversation>> {
    try {
      const fields: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (updates.userId !== undefined) { fields.push(`user_id = $${idx++}`); params.push(updates.userId); }
      if (updates.platform !== undefined) { fields.push(`platform = $${idx++}`); params.push(updates.platform); }
      if (updates.lastMessageAt !== undefined) { fields.push(`last_message_at = $${idx++}`); params.push(updates.lastMessageAt); }
      if (updates.closedAt !== undefined) { fields.push(`closed_at = $${idx++}`); params.push(updates.closedAt); }
      if (updates.active !== undefined) { fields.push(`active = $${idx++}`); params.push(updates.active); }
      if (updates.mode !== undefined) { fields.push(`mode = $${idx++}`); params.push(updates.mode); }
      if (updates.context !== undefined) { fields.push(`context = $${idx++}`); params.push(JSON.stringify(updates.context)); }
      if (updates.metadata !== undefined) { fields.push(`metadata = $${idx++}`); params.push(JSON.stringify(updates.metadata)); }

      fields.push(`updated_at = $${idx++}`);
      params.push(Date.now());

      params.push(conversationId);

      const sql = `UPDATE conversations SET ${fields.join(', ')} WHERE conversation_id = $${idx} RETURNING *`;
      const result = await this.connection.query(sql, params);

      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Conversation ${conversationId} not found`);
      }
      return success(rowToConversation(result.rows[0]));
    } catch (err) {
      return error('UPDATE_FAILED', `Failed to update conversation: ${(err as Error).message}`);
    }
  }

  async delete(conversationId: UUID): Promise<OperationResult<boolean>> {
    try {
      const result = await this.connection.query(
        'DELETE FROM conversations WHERE conversation_id = $1',
        [conversationId]
      );
      if (result.rowCount === 0) {
        return error('NOT_FOUND', `Conversation ${conversationId} not found`);
      }
      return success(true);
    } catch (err) {
      return error('DELETE_FAILED', `Failed to delete conversation: ${(err as Error).message}`);
    }
  }

  async findByUserId(userId: string): Promise<OperationResult<Conversation[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return success(result.rows.map(rowToConversation));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find conversations: ${(err as Error).message}`);
    }
  }

  async findActive(): Promise<OperationResult<Conversation[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM conversations WHERE active = TRUE ORDER BY last_message_at DESC'
      );
      return success(result.rows.map(rowToConversation));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find active conversations: ${(err as Error).message}`);
    }
  }

  async findByPlatform(platform: PlatformType): Promise<OperationResult<Conversation[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM conversations WHERE platform = $1 ORDER BY created_at DESC',
        [platform]
      );
      return success(result.rows.map(rowToConversation));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to find conversations by platform: ${(err as Error).message}`);
    }
  }

  async addMessage(conversationId: UUID, message: ContextMessage): Promise<OperationResult<ContextMessage>> {
    try {
      const sql = `
        INSERT INTO messages (conversation_id, message_id, timestamp, role, content, intent, emotion, confidence, handled_by, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const params = [
        conversationId,
        message.messageId,
        message.timestamp,
        message.role,
        message.content,
        message.intent ?? null,
        message.emotion ?? null,
        message.confidence ?? null,
        message.handledBy,
        message.metadata ? JSON.stringify(message.metadata) : null,
      ];
      const result = await this.connection.query(sql, params);

      // Update conversation timestamps
      await this.connection.query(
        'UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE conversation_id = $2',
        [Date.now(), conversationId]
      );

      return success(rowToMessage(result.rows[0]));
    } catch (err) {
      return error('ADD_MESSAGE_FAILED', `Failed to add message: ${(err as Error).message}`);
    }
  }

  async getMessages(conversationId: UUID): Promise<OperationResult<ContextMessage[]>> {
    try {
      const result = await this.connection.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC',
        [conversationId]
      );
      return success(result.rows.map(rowToMessage));
    } catch (err) {
      return error('QUERY_FAILED', `Failed to get messages: ${(err as Error).message}`);
    }
  }

  async clearMessages(conversationId: UUID): Promise<OperationResult<boolean>> {
    try {
      await this.connection.query(
        'DELETE FROM messages WHERE conversation_id = $1',
        [conversationId]
      );
      return success(true);
    } catch (err) {
      return error('CLEAR_FAILED', `Failed to clear messages: ${(err as Error).message}`);
    }
  }

  async close(conversationId: UUID): Promise<OperationResult<Conversation>> {
    try {
      const now = Date.now();
      const result = await this.connection.query(
        'UPDATE conversations SET active = FALSE, closed_at = $1, updated_at = $1 WHERE conversation_id = $2 RETURNING *',
        [now, conversationId]
      );
      if (result.rows.length === 0) {
        return error('NOT_FOUND', `Conversation ${conversationId} not found`);
      }
      return success(rowToConversation(result.rows[0]));
    } catch (err) {
      return error('CLOSE_FAILED', `Failed to close conversation: ${(err as Error).message}`);
    }
  }

  async closeInactive(maxIdleMs: number): Promise<OperationResult<number>> {
    try {
      const now = Date.now();
      const cutoff = now - maxIdleMs;
      const result = await this.connection.query(
        'UPDATE conversations SET active = FALSE, closed_at = $1, updated_at = $1 WHERE active = TRUE AND last_message_at < $2',
        [now, cutoff]
      );
      return success(result.rowCount ?? 0);
    } catch (err) {
      return error('CLOSE_INACTIVE_FAILED', `Failed to close inactive conversations: ${(err as Error).message}`);
    }
  }
}
