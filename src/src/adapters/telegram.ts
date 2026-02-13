import crypto from 'crypto';
import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import {
  UniversalMessage,
  MessageSendResult,
  UserInfo,
  PlatformType,
  MessageType,
  Language,
} from '../types';
import type { BusinessConnectionUpdate, BusinessMessage, WebhookInfo } from '../types/telegram-business';
import { Logger } from '../utils/logger';

const log = new Logger({ component: 'TelegramAdapter' });

export interface TelegramWebhookConfig {
  url: string;
  path?: string;        // default: /webhook/telegram
  secretToken?: string;
  maxRetries?: number;   // default: 3
}

export interface BusinessConnection {
  id: string;
  userId: number;
  canReply: boolean;
  isDeleted: boolean;
  updatedAt: number;
}

export interface TelegramAdapterMetrics {
  regularMessages: number;
  businessMessages: number;
  messagesSent: number;
  messagesFailed: number;
  activeBusinessConnections: number;
}

/** How long to keep stale business connections before cleanup (24h) */
const BUSINESS_CONNECTION_MAX_AGE = 24 * 60 * 60 * 1000;
/** How often to run stale connection cleanup (1h) */
const BUSINESS_CONNECTION_CLEANUP_INTERVAL = 60 * 60 * 1000;

export class TelegramAdapter {
  private bot: TelegramBot | null = null;
  private messageHandler: ((msg: UniversalMessage) => Promise<void>) | null = null;
  private conversationResetHandler: ((conversationId: string) => Promise<void>) | null = null;
  private readonly platform: PlatformType = PlatformType.TELEGRAM;
  private readonly token: string;
  private readonly webhookConfig?: TelegramWebhookConfig;
  private useWebhook: boolean = false;

  // Business connection tracking: connectionId -> BusinessConnection
  private businessConnections: Map<string, BusinessConnection> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Metrics
  private metrics: TelegramAdapterMetrics = {
    regularMessages: 0,
    businessMessages: 0,
    messagesSent: 0,
    messagesFailed: 0,
    activeBusinessConnections: 0,
  };

  constructor(token: string, webhookConfig?: TelegramWebhookConfig) {
    this.token = token;
    this.webhookConfig = webhookConfig;
    this.useWebhook = !!webhookConfig?.url;
  }

  /**
   * Initialize the Telegram bot.
   * If webhookConfig is provided — sets webhook with retry logic (no polling).
   * Otherwise — uses polling (backward compatible).
   */
  async initialize(): Promise<void> {
    if (this.useWebhook && this.webhookConfig) {
      this.bot = new TelegramBot(this.token, { polling: false });

      const webhookOptions: Record<string, any> = {};
      if (this.webhookConfig.secretToken) {
        webhookOptions.secret_token = this.webhookConfig.secretToken;
      }

      const maxRetries = this.webhookConfig.maxRetries ?? 3;
      await this.setWebHookWithRetry(this.webhookConfig.url, webhookOptions, maxRetries);
      log.info('Webhook configured', { url: this.webhookConfig.url });
    } else {
      this.bot = new TelegramBot(this.token, {
        polling: {
          params: {
            allowed_updates: [
              'message',
              'edited_message',
              'business_connection',
              'business_message',
              'edited_business_message',
              'deleted_business_messages',
            ],
          },
        },
      });
      log.info('Initialized with polling (allowed_updates includes deleted_business_messages)');
    }

    this.setupListeners();
    this.startCleanupTimer();
  }

  /**
   * Set webhook with exponential backoff retry.
   */
  private async setWebHookWithRetry(
    url: string,
    options: Record<string, any>,
    maxRetries: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.bot!.setWebHook(url, options);
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        log.warn(`setWebHook attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms`, {
          error: String(error),
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * Set up event listeners for regular, business messages and connections.
   */
  private setupListeners(): void {
    if (!this.bot) return;

    // Regular direct messages
    this.bot.on('message', async (msg: TelegramBot.Message) => {
      // Команда /reset <conversationId> — сброс разговора (для тестирования)
      if (msg.text?.startsWith('/reset')) {
        const parts = msg.text.split(/\s+/);
        const targetId = parts[1];
        if (targetId && this.conversationResetHandler) {
          try {
            await this.conversationResetHandler(targetId);
            log.info('🔄 Manual reset via /reset command', { targetId, from: msg.from?.id });
            if (this.bot) {
              await this.bot.sendMessage(msg.chat.id, `✅ Разговор ${targetId} сброшен в AI-режим`);
            }
          } catch (error) {
            log.error('Error in manual reset', { targetId, error: String(error) });
            if (this.bot) {
              await this.bot.sendMessage(msg.chat.id, `❌ Ошибка сброса: ${String(error)}`);
            }
          }
        } else if (!targetId) {
          if (this.bot) {
            await this.bot.sendMessage(msg.chat.id, 'Использование: /reset <conversationId>');
          }
        }
        return;
      }

      this.metrics.regularMessages++;
      await this.handleRawMessage(msg);
    });

    // Business messages (from Telegram Business accounts)
    (this.bot as any).on('business_message', async (msg: BusinessMessage) => {
      this.metrics.businessMessages++;
      await this.handleRawMessage(msg, true);
    });

    // Edited business messages
    (this.bot as any).on('edited_business_message', async (msg: BusinessMessage) => {
      log.debug('Edited business message received', {
        chatId: String(msg.chat.id),
        messageId: String(msg.message_id),
        businessConnectionId: msg.business_connection_id,
      });
      // Treat as a new message for the orchestrator
      this.metrics.businessMessages++;
      await this.handleRawMessage(msg, true);
    });

    // Business connection events — track can_reply state
    (this.bot as any).on('business_connection', (connection: BusinessConnectionUpdate) => {
      this.handleBusinessConnection(connection);
    });

    // Deleted business messages — при очистке чата клиентом сбрасываем разговор
    (this.bot as any).on('deleted_business_messages', async (data: any) => {
      const chatId = data?.chat?.id;
      if (!chatId) return;

      const conversationId = String(chatId);
      const messageCount = data?.message_ids?.length || 0;

      log.info('🗑️ Business messages deleted event received', {
        conversationId,
        messageCount,
        messageIds: data?.message_ids,
        businessConnectionId: data?.business_connection_id,
        hasResetHandler: !!this.conversationResetHandler,
        rawData: JSON.stringify(data).substring(0, 500),
      });

      // Любое удаление бизнес-сообщений → полный сброс разговора
      // (при очистке чата Telegram может прислать даже 1 сообщение)
      if (messageCount >= 1 && this.conversationResetHandler) {
        log.info('🔄 Chat messages deleted — resetting conversation to AI mode', { conversationId, messageCount });
        try {
          await this.conversationResetHandler(conversationId);
          log.info('✅ Conversation reset successful', { conversationId });
        } catch (error) {
          log.error('❌ Error resetting conversation on chat clear', { conversationId, error: String(error) });
        }
      } else if (!this.conversationResetHandler) {
        log.warn('⚠️ deleted_business_messages received but no resetHandler set!', { conversationId });
      }
    });
  }

  /**
   * Track business connection state.
   */
  private handleBusinessConnection(connection: BusinessConnectionUpdate): void {
    const bc: BusinessConnection = {
      id: connection.id,
      userId: connection.user?.id,
      canReply: connection.can_reply ?? false,
      isDeleted: connection.is_deleted ?? false,
      updatedAt: Date.now(),
    };

    if (bc.isDeleted) {
      this.businessConnections.delete(bc.id);
      log.info('Business connection removed', { connectionId: bc.id, userId: bc.userId });
    } else {
      this.businessConnections.set(bc.id, bc);
      log.info('Business connection updated', {
        connectionId: bc.id,
        userId: bc.userId,
        canReply: bc.canReply,
      });
    }

    this.metrics.activeBusinessConnections = this.countActiveBusinessConnections();
  }

  /**
   * Start periodic cleanup of stale business connections.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
    }, BUSINESS_CONNECTION_CLEANUP_INTERVAL);
  }

  /**
   * Remove business connections not updated in BUSINESS_CONNECTION_MAX_AGE.
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, conn] of this.businessConnections) {
      if (now - conn.updatedAt > BUSINESS_CONNECTION_MAX_AGE) {
        this.businessConnections.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      log.info('Cleaned stale business connections', { count: cleaned });
      this.metrics.activeBusinessConnections = this.countActiveBusinessConnections();
    }
  }

  /**
   * Process a raw Telegram message (regular or business).
   */
  private async handleRawMessage(msg: TelegramBot.Message, isBusiness: boolean = false): Promise<void> {
    if (!this.messageHandler) {
      log.warn('Message received but no handler is set');
      return;
    }

    try {
      const universalMessage = this.convertToUniversal(msg, isBusiness);
      await this.messageHandler(universalMessage);
    } catch (error) {
      log.error('Error processing incoming message', { error: String(error) });
    }
  }

  /**
   * Returns express middleware for handling webhook updates.
   * Uses timing-safe comparison for secret token validation.
   */
  getWebhookMiddleware(): (req: Request, res: Response) => void {
    return (req: Request, res: Response) => {
      if (this.webhookConfig?.secretToken) {
        const headerToken = String(req.headers['x-telegram-bot-api-secret-token'] || '');
        if (!this.timingSafeEqual(headerToken, this.webhookConfig.secretToken)) {
          res.sendStatus(403);
          return;
        }
      }

      if (this.bot && req.body) {
        const update = req.body;

        // Логируем ВСЕ типы update'ов для диагностики
        const updateKeys = Object.keys(update).filter(k => k !== 'update_id');
        log.info('📨 Raw webhook update', {
          update_id: update.update_id,
          types: updateKeys.join(','),
        });

        // Ручная обработка deleted_business_messages из raw body
        // (на случай если библиотека не эмитит событие)
        if (update.deleted_business_messages) {
          const data = update.deleted_business_messages;
          const chatId = data?.chat?.id;
          const messageCount = data?.message_ids?.length || 0;
          log.info('🗑️ deleted_business_messages in raw webhook', {
            chatId,
            messageCount,
            messageIds: data?.message_ids,
            businessConnectionId: data?.business_connection_id,
          });
          if (chatId && messageCount >= 1 && this.conversationResetHandler) {
            const conversationId = String(chatId);
            log.info('🔄 Resetting conversation from raw webhook handler', { conversationId });
            this.conversationResetHandler(conversationId).catch(err => {
              log.error('Error in raw webhook reset', { conversationId, error: String(err) });
            });
          }
        }

        this.bot.processUpdate(update);
      }

      res.sendStatus(200);
    };
  }

  /**
   * Timing-safe string comparison to prevent timing attacks on secret token.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Stop the bot and clean up.
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.bot) {
      if (this.useWebhook) {
        await this.bot.deleteWebHook();
        log.info('Webhook removed, shutdown complete');
      } else {
        await this.bot.stopPolling();
        log.info('Polling stopped, shutdown complete');
      }
    }
  }

  /**
   * Set the callback that will handle incoming messages converted to UniversalMessage.
   */
  setMessageHandler(handler: (msg: UniversalMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Коллбек при очистке чата — вызывается когда Telegram присылает deleted_business_messages.
   * Используется для полного сброса разговора (HUMAN mode, контекст, кэши).
   */
  setConversationResetHandler(handler: (conversationId: string) => Promise<void>): void {
    this.conversationResetHandler = handler;
  }

  /**
   * Send a text message to a conversation (chat).
   * If businessConnectionId is provided, checks can_reply before sending.
   */
  async sendMessage(
    conversationId: string,
    text: string,
    businessConnectionId?: string,
  ): Promise<MessageSendResult> {
    if (!this.bot) {
      this.metrics.messagesFailed++;
      return {
        messageId: '',
        platformMessageId: '',
        timestamp: Date.now(),
        status: 'failed',
      };
    }

    if (businessConnectionId && !this.canReplyToBusiness(businessConnectionId)) {
      log.warn('Cannot reply via business connection', {
        connectionId: businessConnectionId,
        reason: 'deleted or can_reply=false',
      });
      this.metrics.messagesFailed++;
      return {
        messageId: '',
        platformMessageId: '',
        timestamp: Date.now(),
        status: 'failed',
      };
    }

    try {
      const options: Record<string, any> = {};
      if (businessConnectionId) {
        options.business_connection_id = businessConnectionId;
      }

      const sentMessage = await this.bot.sendMessage(conversationId, text, options);
      this.metrics.messagesSent++;

      return {
        messageId: uuidv4(),
        platformMessageId: String(sentMessage.message_id),
        timestamp: sentMessage.date ? sentMessage.date * 1000 : Date.now(),
        status: 'sent',
      };
    } catch (error) {
      log.error('Error sending message', { conversationId, error: String(error) });
      this.metrics.messagesFailed++;
      return {
        messageId: '',
        platformMessageId: '',
        timestamp: Date.now(),
        status: 'failed',
      };
    }
  }

  /**
   * Send a document/file to a conversation.
   */
  async sendDocument(
    conversationId: string,
    filePath: string,
    options?: { caption?: string; businessConnectionId?: string },
  ): Promise<MessageSendResult> {
    if (!this.bot) {
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    const bizId = options?.businessConnectionId;
    if (bizId && !this.canReplyToBusiness(bizId)) {
      log.warn('Cannot send document via business connection', { connectionId: bizId });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    try {
      const sendOpts: Record<string, any> = {};
      if (options?.caption) sendOpts.caption = options.caption;
      if (bizId) sendOpts.business_connection_id = bizId;

      const sentMessage = await this.bot.sendDocument(conversationId, filePath, sendOpts);
      this.metrics.messagesSent++;

      return {
        messageId: uuidv4(),
        platformMessageId: String(sentMessage.message_id),
        timestamp: sentMessage.date ? sentMessage.date * 1000 : Date.now(),
        status: 'sent',
      };
    } catch (error) {
      log.error('Error sending document', { conversationId, filePath, error: String(error) });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }
  }

  /**
   * Send a photo to the specified conversation.
   */
  async sendPhoto(
    conversationId: string,
    photo: string, // file path or URL or file_id
    options?: { caption?: string; businessConnectionId?: string },
  ): Promise<MessageSendResult> {
    if (!this.bot) {
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    const bizId = options?.businessConnectionId;
    if (bizId && !this.canReplyToBusiness(bizId)) {
      log.warn('Cannot send photo via business connection', { connectionId: bizId });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    try {
      const sendOpts: Record<string, any> = {};
      if (options?.caption) sendOpts.caption = options.caption;
      if (bizId) sendOpts.business_connection_id = bizId;

      const sentMessage = await this.bot.sendPhoto(conversationId, photo, sendOpts);
      this.metrics.messagesSent++;

      return {
        messageId: uuidv4(),
        platformMessageId: String(sentMessage.message_id),
        timestamp: sentMessage.date ? sentMessage.date * 1000 : Date.now(),
        status: 'sent',
      };
    } catch (error) {
      log.error('Error sending photo', { conversationId, photo, error: String(error) });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }
  }

  /**
   * Send a video to the specified conversation.
   */
  async sendVideo(
    conversationId: string,
    video: string, // file path or URL or file_id
    options?: { caption?: string; businessConnectionId?: string },
  ): Promise<MessageSendResult> {
    if (!this.bot) {
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    const bizId = options?.businessConnectionId;
    if (bizId && !this.canReplyToBusiness(bizId)) {
      log.warn('Cannot send video via business connection', { connectionId: bizId });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }

    try {
      const sendOpts: Record<string, any> = {};
      if (options?.caption) sendOpts.caption = options.caption;
      if (bizId) sendOpts.business_connection_id = bizId;

      const sentMessage = await this.bot.sendVideo(conversationId, video, sendOpts);
      this.metrics.messagesSent++;

      return {
        messageId: uuidv4(),
        platformMessageId: String(sentMessage.message_id),
        timestamp: sentMessage.date ? sentMessage.date * 1000 : Date.now(),
        status: 'sent',
      };
    } catch (error) {
      log.error('Error sending video', { conversationId, video, error: String(error) });
      this.metrics.messagesFailed++;
      return { messageId: '', platformMessageId: '', timestamp: Date.now(), status: 'failed' };
    }
  }

  /**
   * Send a typing indicator to the specified conversation.
   */
  async sendTypingIndicator(
    conversationId: string,
    businessConnectionId?: string,
  ): Promise<void> {
    if (!this.bot) return;

    if (businessConnectionId && !this.canReplyToBusiness(businessConnectionId)) {
      return;
    }

    try {
      const options: Record<string, any> = {};
      if (businessConnectionId) {
        options.business_connection_id = businessConnectionId;
      }
      await this.bot.sendChatAction(conversationId, 'typing', options);
    } catch (error) {
      log.error('Error sending typing indicator', { conversationId, error: String(error) });
    }
  }

  /**
   * Check if a business connection allows replies.
   * Returns true if connection is unknown (optimistic — let Telegram API decide).
   */
  canReplyToBusiness(connectionId: string): boolean {
    const conn = this.businessConnections.get(connectionId);
    if (!conn) return true;
    return conn.canReply && !conn.isDeleted;
  }

  /**
   * Extract businessConnectionId from a UniversalMessage.
   * Use this instead of reaching into metadata.custom directly.
   */
  static extractBusinessConnectionId(message: UniversalMessage): string | undefined {
    return message.metadata?.custom?.businessConnectionId as string | undefined;
  }

  /**
   * Get current webhook status from Telegram API.
   * Returns null if not in webhook mode.
   */
  async getWebhookInfo(): Promise<WebhookInfo | null> {
    if (!this.bot || !this.useWebhook) return null;
    try {
      return await (this.bot as any).getWebHookInfo();
    } catch (error) {
      log.error('Error getting webhook info', { error: String(error) });
      return null;
    }
  }

  /**
   * Retrieve user info from the Telegram API.
   */
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    if (!this.bot) return null;

    try {
      const chatMember = await this.bot.getChat(userId);

      const languageMap: Record<string, Language> = {
        ru: Language.RU,
        en: Language.EN,
        es: Language.ES,
        de: Language.DE,
      };

      return {
        userId: String(chatMember.id),
        platform: this.platform,
        platformUserId: String(chatMember.id),
        username: chatMember.username,
        firstName: chatMember.first_name,
        lastName: chatMember.last_name,
        language: (chatMember as any).language_code
          ? languageMap[(chatMember as any).language_code] ?? undefined
          : undefined,
        metadata: {
          type: chatMember.type,
          bio: chatMember.bio,
        },
      };
    } catch (error) {
      log.error('Error getting user info', { userId, error: String(error) });
      return null;
    }
  }

  /**
   * Convert a raw Telegram message into the UniversalMessage format.
   */
  convertToUniversal(msg: TelegramBot.Message, isBusiness: boolean = false): UniversalMessage {
    const messageType = this.resolveMessageType(msg);
    const businessConnectionId = (msg as any).business_connection_id;

    return {
      messageId: uuidv4(),
      conversationId: String(msg.chat.id),
      userId: msg.from ? String(msg.from.id) : 'unknown',
      timestamp: msg.date ? msg.date * 1000 : Date.now(),
      platform: this.platform,
      platformMessageId: String(msg.message_id),
      content: {
        type: messageType,
        text: msg.text ?? msg.caption ?? undefined,
      },
      metadata: {
        language: msg.from?.language_code
          ? this.mapLanguage(msg.from.language_code)
          : undefined,
        custom: {
          chatType: msg.chat.type,
          fromUsername: msg.from?.username,
          fromFirstName: msg.from?.first_name,
          fromLastName: msg.from?.last_name,
          isBusiness,
          ...(businessConnectionId ? { businessConnectionId } : {}),
        },
      },
    };
  }

  isWebhookMode(): boolean {
    return this.useWebhook;
  }

  getWebhookPath(): string {
    return this.webhookConfig?.path || '/webhook/telegram';
  }

  getPlatformType(): PlatformType {
    return this.platform;
  }

  getMetrics(): TelegramAdapterMetrics {
    return { ...this.metrics };
  }

  // --- Private helpers ---

  private countActiveBusinessConnections(): number {
    let count = 0;
    for (const conn of this.businessConnections.values()) {
      if (conn.canReply && !conn.isDeleted) count++;
    }
    return count;
  }

  private resolveMessageType(msg: TelegramBot.Message): MessageType {
    if (msg.photo) return MessageType.IMAGE;
    if (msg.video) return MessageType.VIDEO;
    if (msg.audio) return MessageType.AUDIO;
    if (msg.voice) return MessageType.VOICE;
    if (msg.document) return MessageType.DOCUMENT;
    if (msg.sticker) return MessageType.STICKER;
    return MessageType.TEXT;
  }

  private mapLanguage(langCode: string): Language | undefined {
    const mapping: Record<string, Language> = {
      ru: Language.RU,
      en: Language.EN,
      es: Language.ES,
      de: Language.DE,
    };
    return mapping[langCode] ?? undefined;
  }
}
