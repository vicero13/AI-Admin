import TelegramBot from 'node-telegram-bot-api';

/**
 * Type augmentations for node-telegram-bot-api business events.
 * The library supports these events but @types/node-telegram-bot-api does not declare them.
 */

export interface BusinessConnectionUpdate {
  id: string;
  user: TelegramBot.User;
  user_chat_id: number;
  date: number;
  can_reply: boolean;
  is_enabled: boolean;
  is_deleted: boolean;
}

export interface BusinessMessage extends TelegramBot.Message {
  business_connection_id: string;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

declare module 'node-telegram-bot-api' {
  interface TelegramBot {
    on(event: 'business_message', listener: (msg: BusinessMessage) => void): this;
    on(event: 'edited_business_message', listener: (msg: BusinessMessage) => void): this;
    on(event: 'business_connection', listener: (conn: BusinessConnectionUpdate) => void): this;
    on(event: 'deleted_business_messages', listener: (data: any) => void): this;
    getWebHookInfo(): Promise<WebhookInfo>;
    getBusinessConnection(businessConnectionId: string): Promise<BusinessConnectionUpdate>;
  }
}
