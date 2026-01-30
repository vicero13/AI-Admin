import {
  Conversation,
  ConversationContext,
  ContextMessage,
  OperationResult,
  Status,
  PlatformType,
  ConversationMode,
  UUID,
  Timestamp,
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

export class ConversationRepository {
  private conversations = new Map<UUID, Conversation>();
  private messages = new Map<UUID, ContextMessage[]>();

  create(conversation: Conversation): OperationResult<Conversation> {
    if (this.conversations.has(conversation.conversationId)) {
      return error('DUPLICATE', `Conversation ${conversation.conversationId} already exists`);
    }
    this.conversations.set(conversation.conversationId, { ...conversation });
    this.messages.set(conversation.conversationId, []);
    return success({ ...conversation });
  }

  get(conversationId: UUID): OperationResult<Conversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    return success({ ...conv });
  }

  update(conversationId: UUID, updates: Partial<Conversation>): OperationResult<Conversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    const updated: Conversation = {
      ...conv,
      ...updates,
      conversationId: conv.conversationId,
      updatedAt: Date.now(),
    };
    this.conversations.set(conversationId, updated);
    return success({ ...updated });
  }

  delete(conversationId: UUID): OperationResult<boolean> {
    if (!this.conversations.has(conversationId)) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    return success(true);
  }

  findByUserId(userId: string): OperationResult<Conversation[]> {
    const results = Array.from(this.conversations.values()).filter(
      (c) => c.userId === userId
    );
    return success(results.map((c) => ({ ...c })));
  }

  findActive(): OperationResult<Conversation[]> {
    const results = Array.from(this.conversations.values()).filter(
      (c) => c.active
    );
    return success(results.map((c) => ({ ...c })));
  }

  findByPlatform(platform: PlatformType): OperationResult<Conversation[]> {
    const results = Array.from(this.conversations.values()).filter(
      (c) => c.platform === platform
    );
    return success(results.map((c) => ({ ...c })));
  }

  addMessage(conversationId: UUID, message: ContextMessage): OperationResult<ContextMessage> {
    if (!this.conversations.has(conversationId)) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    const msgs = this.messages.get(conversationId)!;
    msgs.push({ ...message });

    const conv = this.conversations.get(conversationId)!;
    conv.lastMessageAt = Date.now();
    conv.updatedAt = Date.now();

    return success({ ...message });
  }

  getMessages(conversationId: UUID): OperationResult<ContextMessage[]> {
    if (!this.conversations.has(conversationId)) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    const msgs = this.messages.get(conversationId) ?? [];
    return success(msgs.map((m) => ({ ...m })));
  }

  clearMessages(conversationId: UUID): OperationResult<boolean> {
    if (!this.conversations.has(conversationId)) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    this.messages.set(conversationId, []);
    return success(true);
  }

  close(conversationId: UUID): OperationResult<Conversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      return error('NOT_FOUND', `Conversation ${conversationId} not found`);
    }
    conv.active = false;
    conv.closedAt = Date.now();
    conv.updatedAt = Date.now();
    return success({ ...conv });
  }

  closeInactive(maxIdleMs: number): OperationResult<number> {
    const now = Date.now();
    let closed = 0;
    for (const conv of this.conversations.values()) {
      if (conv.active && now - conv.lastMessageAt > maxIdleMs) {
        conv.active = false;
        conv.closedAt = now;
        conv.updatedAt = now;
        closed++;
      }
    }
    return success(closed);
  }
}
