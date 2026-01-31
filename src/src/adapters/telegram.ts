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

export class TelegramAdapter {
  private bot: TelegramBot | null = null;
  private messageHandler: ((msg: UniversalMessage) => Promise<void>) | null = null;
  private readonly platform: PlatformType = PlatformType.TELEGRAM;
  private readonly token: string;
  private readonly webhookConfig?: TelegramWebhookConfig;
  private useWebhook: boolean = false;

  // Business connection tracking: connectionId -> BusinessConnection
  private businessConnections: Map<string, BusinessConnection> = new Map();

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
      console.log(`[TelegramAdapter] Webhook set to ${this.webhookConfig.url}`);
    } else {
      this.bot = new TelegramBot(this.token, { polling: true });
      console.log('[TelegramAdapter] Initialized with polling.');
    }

    this.setupListeners();
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
        console.warn(
          `[TelegramAdapter] setWebHook attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`,
          error,
        );
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
      this.metrics.regularMessages++;
      await this.handleRawMessage(msg);
    });

    // Business messages (from Telegram Business accounts)
    this.bot.on('business_message' as any, async (msg: any) => {
      this.metrics.businessMessages++;
      await this.handleRawMessage(msg, true);
    });

    // Business connection events — track can_reply state
    this.bot.on('business_connection' as any, (connection: any) => {
      const bc: BusinessConnection = {
        id: connection.id,
        userId: connection.user?.id,
        canReply: connection.can_reply ?? false,
        isDeleted: connection.is_deleted ?? false,
        updatedAt: Date.now(),
      };

      if (bc.isDeleted) {
        this.businessConnections.delete(bc.id);
        console.log(`[TelegramAdapter] Business connection ${bc.id} removed (deleted)`);
      } else {
        this.businessConnections.set(bc.id, bc);
        console.log(
          `[TelegramAdapter] Business connection ${bc.id}: ` +
          `user=${bc.userId}, canReply=${bc.canReply}`,
        );
      }

      this.metrics.activeBusinessConnections = this.countActiveBusinessConnections();
    });
  }

  /**
   * Process a raw Telegram message (regular or business).
   */
  private async handleRawMessage(msg: TelegramBot.Message, isBusiness: boolean = false): Promise<void> {
    if (!this.messageHandler) {
      console.warn('[TelegramAdapter] Message received but no handler is set.');
      return;
    }

    try {
      const universalMessage = this.convertToUniversal(msg, isBusiness);
      await this.messageHandler(universalMessage);
    } catch (error) {
      console.error('[TelegramAdapter] Error processing incoming message:', error);
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
        this.bot.processUpdate(req.body);
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
      // Compare against self to keep constant time, then return false
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Stop the bot and clean up.
   */
  async shutdown(): Promise<void> {
    if (this.bot) {
      if (this.useWebhook) {
        await this.bot.deleteWebHook();
        console.log('[TelegramAdapter] Webhook removed. Shutdown complete.');
      } else {
        await this.bot.stopPolling();
        console.log('[TelegramAdapter] Polling stopped. Shutdown complete.');
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

    // Check business connection can_reply status
    if (businessConnectionId && !this.canReplyToBusiness(businessConnectionId)) {
      console.warn(
        `[TelegramAdapter] Cannot reply via business connection ${businessConnectionId}: ` +
        `connection deleted or can_reply=false`,
      );
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
      console.error('[TelegramAdapter] Error sending message:', error);
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
   * Send a typing indicator to the specified conversation.
   */
  async sendTypingIndicator(
    conversationId: string,
    businessConnectionId?: string,
  ): Promise<void> {
    if (!this.bot) {
      return;
    }

    // Don't send typing if business connection can't reply
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
      console.error('[TelegramAdapter] Error sending typing indicator:', error);
    }
  }

  /**
   * Check if a business connection allows replies.
   * Returns true if connection is unknown (optimistic — let Telegram API decide).
   */
  canReplyToBusiness(connectionId: string): boolean {
    const conn = this.businessConnections.get(connectionId);
    if (!conn) return true; // Unknown connection — allow (Telegram API will reject if invalid)
    return conn.canReply && !conn.isDeleted;
  }

  /**
   * Retrieve user info from the Telegram API.
   */
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    if (!this.bot) {
      return null;
    }

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
      console.error('[TelegramAdapter] Error getting user info:', error);
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

  /**
   * Whether this adapter is running in webhook mode.
   */
  isWebhookMode(): boolean {
    return this.useWebhook;
  }

  /**
   * The webhook path (for mounting on express).
   */
  getWebhookPath(): string {
    return this.webhookConfig?.path || '/webhook/telegram';
  }

  /**
   * Return the platform type this adapter handles.
   */
  getPlatformType(): PlatformType {
    return this.platform;
  }

  /**
   * Current adapter metrics (message counts, business connections).
   */
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
