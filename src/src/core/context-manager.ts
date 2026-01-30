import {
  ConversationContext,
  ContextMessage,
  ClientProfile,
  ClientType,
  PlatformType,
  EmotionalState,
  ConversationMode,
  Timestamp,
} from '../types';
import { Logger } from '../utils/logger';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_LENGTH = 20;

export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private clientProfiles: Map<string, ClientProfile> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ component: 'ContextManager' });
  }

  /**
   * Creates a new ConversationContext with default values.
   */
  createContext(
    userId: string,
    conversationId: string,
    platform: PlatformType,
  ): ConversationContext {
    const now = Date.now();

    const context: ConversationContext = {
      conversationId,
      userId,
      platform,
      sessionStarted: now,
      lastActivity: now,
      expiresAt: now + TWENTY_FOUR_HOURS_MS,
      clientType: ClientType.NEW,
      messageHistory: [],
      emotionalState: EmotionalState.NEUTRAL,
      suspectAI: false,
      complexQuery: false,
      requiresHandoff: false,
      mode: ConversationMode.AI,
      metadata: {},
    };

    this.contexts.set(conversationId, context);
    this.logger.info(`Context created for conversation ${conversationId}`, {
      userId,
      platform,
      conversationId,
    });

    return context;
  }

  /**
   * Returns an existing context or creates a new one if not found.
   */
  getContext(
    conversationId: string,
    userId: string = '',
    platform: PlatformType = PlatformType.WEB,
  ): ConversationContext {
    const existing = this.contexts.get(conversationId);
    if (existing) {
      this.logger.debug(`Context retrieved for conversation ${conversationId}`);
      return existing;
    }

    this.logger.info(
      `Context not found for conversation ${conversationId}, creating new`,
    );
    return this.createContext(userId, conversationId, platform);
  }

  /**
   * Applies a partial update to an existing context.
   */
  updateContext(
    conversationId: string,
    updates: Partial<ConversationContext>,
  ): ConversationContext | undefined {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot update context: conversation ${conversationId} not found`,
      );
      return undefined;
    }

    Object.assign(context, updates);
    context.lastActivity = Date.now();
    this.contexts.set(conversationId, context);

    this.logger.debug(`Context updated for conversation ${conversationId}`, {
      updatedFields: Object.keys(updates),
    });

    return context;
  }

  /**
   * Adds a message to the conversation history.
   * Keeps only the last 20 messages and updates lastActivity.
   */
  addMessage(conversationId: string, message: ContextMessage): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot add message: conversation ${conversationId} not found`,
      );
      return;
    }

    context.messageHistory.push(message);

    if (context.messageHistory.length > MAX_HISTORY_LENGTH) {
      context.messageHistory = context.messageHistory.slice(
        -MAX_HISTORY_LENGTH,
      );
    }

    context.lastActivity = Date.now();

    this.logger.debug(
      `Message added to conversation ${conversationId}, history length: ${context.messageHistory.length}`,
      { messageId: message.messageId, role: message.role },
    );
  }

  /**
   * Returns the message history for a conversation, optionally limited.
   */
  getHistory(conversationId: string, limit?: number): ContextMessage[] {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot get history: conversation ${conversationId} not found`,
      );
      return [];
    }

    if (limit !== undefined && limit > 0) {
      return context.messageHistory.slice(-limit);
    }

    return [...context.messageHistory];
  }

  /**
   * Clears message history for a conversation.
   */
  clearHistory(conversationId: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot clear history: conversation ${conversationId} not found`,
      );
      return;
    }

    const previousLength = context.messageHistory.length;
    context.messageHistory = [];

    this.logger.info(
      `History cleared for conversation ${conversationId}, removed ${previousLength} messages`,
    );
  }

  /**
   * Returns an existing ClientProfile or creates a new one.
   */
  identifyClient(userId: string, platform: PlatformType): ClientProfile {
    const existing = this.clientProfiles.get(userId);
    if (existing) {
      existing.lastContact = Date.now();
      existing.totalConversations += 1;
      this.logger.debug(`Client identified: ${userId}`, {
        type: existing.type,
      });
      return existing;
    }

    const now = Date.now();
    const profile: ClientProfile = {
      userId,
      platform,
      firstContact: now,
      lastContact: now,
      totalConversations: 1,
      totalMessages: 0,
      type: ClientType.NEW,
      tags: [],
      previousTopics: [],
      metadata: {},
    };

    this.clientProfiles.set(userId, profile);
    this.logger.info(`New client profile created for ${userId}`, { platform });

    return profile;
  }

  /**
   * Applies a partial update to an existing client profile.
   */
  updateClientProfile(
    userId: string,
    updates: Partial<ClientProfile>,
  ): ClientProfile | undefined {
    const profile = this.clientProfiles.get(userId);
    if (!profile) {
      this.logger.warn(
        `Cannot update client profile: user ${userId} not found`,
      );
      return undefined;
    }

    Object.assign(profile, updates);
    this.clientProfiles.set(userId, profile);

    this.logger.debug(`Client profile updated for ${userId}`, {
      updatedFields: Object.keys(updates),
    });

    return profile;
  }

  /**
   * Retrieves a client profile by userId.
   */
  getClientProfile(userId: string): ClientProfile | undefined {
    return this.clientProfiles.get(userId);
  }

  /**
   * Sets the current topic for a conversation.
   */
  setCurrentTopic(conversationId: string, topic: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot set topic: conversation ${conversationId} not found`,
      );
      return;
    }

    context.currentTopic = topic;
    context.lastActivity = Date.now();
    this.logger.debug(
      `Topic set for conversation ${conversationId}: ${topic}`,
    );
  }

  /**
   * Sets the emotional state for a conversation.
   */
  setEmotionalState(
    conversationId: string,
    state: EmotionalState,
  ): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot set emotional state: conversation ${conversationId} not found`,
      );
      return;
    }

    const previousState = context.emotionalState;
    context.emotionalState = state;
    context.lastActivity = Date.now();

    this.logger.debug(
      `Emotional state changed for conversation ${conversationId}: ${previousState} -> ${state}`,
    );
  }

  /**
   * Sets the suspectAI flag for a conversation.
   */
  setSuspectAI(conversationId: string, suspect: boolean): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot set suspectAI: conversation ${conversationId} not found`,
      );
      return;
    }

    context.suspectAI = suspect;
    context.lastActivity = Date.now();

    if (suspect) {
      this.logger.info(
        `AI probing suspected in conversation ${conversationId}`,
      );
    }
  }

  /**
   * Sets the complexQuery flag for a conversation.
   */
  setComplexQuery(conversationId: string, complex: boolean): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      this.logger.warn(
        `Cannot set complexQuery: conversation ${conversationId} not found`,
      );
      return;
    }

    context.complexQuery = complex;
    context.lastActivity = Date.now();

    if (complex) {
      this.logger.info(
        `Complex query detected in conversation ${conversationId}`,
      );
    }
  }

  /**
   * Removes a context entirely.
   */
  clearContext(conversationId: string): void {
    const deleted = this.contexts.delete(conversationId);
    if (deleted) {
      this.logger.info(`Context cleared for conversation ${conversationId}`);
    } else {
      this.logger.warn(
        `Cannot clear context: conversation ${conversationId} not found`,
      );
    }
  }

  /**
   * Removes all contexts with lastActivity older than the given timestamp.
   * Returns the number of expired contexts removed.
   */
  expireOldContexts(olderThan: Timestamp): number {
    let expiredCount = 0;

    for (const [conversationId, context] of this.contexts) {
      if (context.lastActivity < olderThan) {
        this.contexts.delete(conversationId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.info(`Expired ${expiredCount} old context(s)`, {
        olderThan,
        remainingContexts: this.contexts.size,
      });
    }

    return expiredCount;
  }
}
