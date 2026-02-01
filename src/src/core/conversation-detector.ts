// ============================================================
// Conversation Detector — Определение нового разговора
// Проверяет: очищен ли чат, давно ли не писали (180 дней), первый контакт
// ============================================================

import { ConversationContext } from '../types';

export interface ConversationDetectorConfig {
  enabled: boolean;
  newConversationGapDays: number;    // 180 — дней без общения для "нового разговора"
  newDayGapHours: number;            // Часов с последнего сообщения для "нового дня"
  chatClearedDetection: boolean;     // Проверять, был ли чат очищен (message_id gap)
}

export type ConversationStatus = 'new_contact' | 'new_conversation' | 'new_day' | 'continuation';

export class ConversationDetector {
  private config: ConversationDetectorConfig;
  // Кэш последних message_id для определения очистки чата
  private lastMessageIds: Map<string, number> = new Map();

  constructor(config: ConversationDetectorConfig) {
    this.config = config;
  }

  /**
   * Определить статус разговора
   */
  detectStatus(
    conversationId: string,
    context: ConversationContext,
    currentMessageId?: number
  ): ConversationStatus {
    if (!this.config.enabled) return 'continuation';

    // 1. Первый контакт — нет истории сообщений
    if (!context.messageHistory || context.messageHistory.length === 0) {
      return 'new_contact';
    }

    // 2. Проверка очистки чата (резкий скачок message_id)
    if (this.config.chatClearedDetection && currentMessageId !== undefined) {
      const chatCleared = this.detectChatCleared(conversationId, currentMessageId);
      if (chatCleared) {
        return 'new_conversation';
      }
      // Обновить последний известный message_id
      this.lastMessageIds.set(conversationId, currentMessageId);
    }

    // 3. Разрыв в 180+ дней → новый разговор
    const lastActivity = context.lastActivity;
    if (lastActivity) {
      const gapMs = Date.now() - lastActivity;
      const gapDays = gapMs / (1000 * 60 * 60 * 24);

      if (gapDays >= this.config.newConversationGapDays) {
        return 'new_conversation';
      }

      // 4. Новый день (gapHours+)
      const gapHours = gapMs / (1000 * 60 * 60);
      if (gapHours >= this.config.newDayGapHours) {
        return 'new_day';
      }
    }

    return 'continuation';
  }

  /**
   * Определить тип приветствия на основе статуса
   */
  getGreetingType(status: ConversationStatus): 'full' | 'short' | 'none' {
    switch (status) {
      case 'new_contact':
        return 'full';
      case 'new_conversation':
        return 'full';
      case 'new_day':
        return 'short';
      case 'continuation':
        return 'none';
    }
  }

  /**
   * Определить, был ли чат очищен
   * Если последний известный message_id << текущий — возможно чат очищен
   */
  private detectChatCleared(conversationId: string, currentMessageId: number): boolean {
    const lastId = this.lastMessageIds.get(conversationId);
    if (lastId === undefined) return false;

    // Если текущий ID значительно меньше последнего — чат мог быть очищен
    // Или если разрыв слишком большой
    if (currentMessageId < lastId) {
      return true; // Сброс ID — чат очищен
    }

    return false;
  }

  /**
   * Сброс данных для разговора
   */
  resetConversation(conversationId: string): void {
    this.lastMessageIds.delete(conversationId);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
