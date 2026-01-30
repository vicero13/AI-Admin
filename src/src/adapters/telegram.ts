import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import {
  UniversalMessage,
  MessageSendResult,
  UserInfo,
  PlatformType,
  MessageType,
  Language,
} from '../types';

export class TelegramAdapter {
  private bot: TelegramBot | null = null;
  private messageHandler: ((msg: UniversalMessage) => Promise<void>) | null = null;
  private readonly platform: PlatformType = PlatformType.TELEGRAM;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Initialize the Telegram bot with polling and set up the message listener.
   */
  async initialize(): Promise<void> {
    this.bot = new TelegramBot(this.token, { polling: true });

    this.bot.on('message', async (msg: TelegramBot.Message) => {
      if (!this.messageHandler) {
        console.warn('[TelegramAdapter] Message received but no handler is set.');
        return;
      }

      try {
        const universalMessage = this.convertToUniversal(msg);
        await this.messageHandler(universalMessage);
      } catch (error) {
        console.error('[TelegramAdapter] Error processing incoming message:', error);
      }
    });

    console.log('[TelegramAdapter] Initialized and polling for messages.');
  }

  /**
   * Stop polling and shut down the bot.
   */
  async shutdown(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
      console.log('[TelegramAdapter] Polling stopped. Shutdown complete.');
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
   */
  async sendMessage(conversationId: string, text: string): Promise<MessageSendResult> {
    if (!this.bot) {
      return {
        messageId: '',
        platformMessageId: '',
        timestamp: Date.now(),
        status: 'failed',
      };
    }

    try {
      const sentMessage = await this.bot.sendMessage(conversationId, text);

      return {
        messageId: uuidv4(),
        platformMessageId: String(sentMessage.message_id),
        timestamp: sentMessage.date ? sentMessage.date * 1000 : Date.now(),
        status: 'sent',
      };
    } catch (error) {
      console.error('[TelegramAdapter] Error sending message:', error);
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
  async sendTypingIndicator(conversationId: string): Promise<void> {
    if (!this.bot) {
      return;
    }

    try {
      await this.bot.sendChatAction(conversationId, 'typing');
    } catch (error) {
      console.error('[TelegramAdapter] Error sending typing indicator:', error);
    }
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
   * Currently handles text messages; media support can be added later.
   */
  convertToUniversal(msg: TelegramBot.Message): UniversalMessage {
    const messageType = this.resolveMessageType(msg);

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
        },
      },
    };
  }

  /**
   * Return the platform type this adapter handles.
   */
  getPlatformType(): PlatformType {
    return this.platform;
  }

  // --- Private helpers ---

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
