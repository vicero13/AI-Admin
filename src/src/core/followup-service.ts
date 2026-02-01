// ============================================================
// Follow-Up Service — Автоматические напоминания (v2.0)
// Новое: context-aware messages, "?" как минимальный nudge
// ============================================================

import { ConversationContext } from '../types';

export interface FollowUpConfig {
  enabled: boolean;
  delayMinutes: number;          // Задержка перед follow-up (60)
  maxPerConversation: number;    // Макс. follow-up за разговор (3)
  cooldownMinutes: number;       // Минимальный интервал между follow-up (30)
  // Контекстно-зависимые шаблоны
  contextMessages?: Record<string, string>;  // viewing_time, presentation_sent, thinking
}

export interface FollowUpAIGenerator {
  generateResponse(request: {
    message: string;
    context: ConversationContext;
    relevantKnowledge: any[];
    personality: any;
    systemPrompt?: string;
  }): Promise<{ text: string }>;
}

export interface FollowUpMessageSender {
  sendMessage(conversationId: string, text: string, businessConnectionId?: string): Promise<any>;
  sendTypingIndicator(conversationId: string, businessConnectionId?: string): Promise<void>;
}

interface FollowUpState {
  timer: ReturnType<typeof setTimeout> | null;
  count: number;
  lastSentAt: number;
  conversationId: string;
  businessConnectionId?: string;
  context?: ConversationContext;
  lastContext?: string;  // viewing_time, presentation_sent, thinking, general
}

// Дефолтные контекстные шаблоны
const DEFAULT_CONTEXT_MESSAGES: Record<string, string> = {
  viewing_time: 'Подскажите, Вам удобно подъехать на этой неделе?',
  presentation_sent: 'Удалось ознакомиться с презентацией? Если есть вопросы — с удовольствием отвечу!',
  thinking: '?',
  general_1: 'Добрый день! Вы рассматривали наше предложение? Если есть вопросы — буду рада помочь!',
  general_2: 'Здравствуйте! Хотела уточнить — нужна ли Вам ещё помощь с выбором помещения?',
  general_3: 'Добрый день! Если у Вас появились вопросы по нашим предложениям, я на связи!',
  minimal: '?',
};

export class FollowUpService {
  private config: FollowUpConfig;
  private aiGenerator?: FollowUpAIGenerator;
  private messageSender?: FollowUpMessageSender;
  private states: Map<string, FollowUpState> = new Map();

  constructor(
    config: FollowUpConfig,
    aiGenerator?: FollowUpAIGenerator,
    messageSender?: FollowUpMessageSender
  ) {
    this.config = config;
    this.aiGenerator = aiGenerator;
    this.messageSender = messageSender;
  }

  /**
   * Запланировать follow-up для разговора
   */
  scheduleFollowUp(
    conversationId: string,
    context: ConversationContext,
    businessConnectionId?: string
  ): void {
    if (!this.config.enabled) return;

    this.cancelFollowUp(conversationId);

    const state = this.getOrCreateState(conversationId);
    state.context = context;
    state.businessConnectionId = businessConnectionId;

    if (!this.canSendMore(conversationId)) return;

    const now = Date.now();
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    if (state.lastSentAt > 0 && (now - state.lastSentAt) < cooldownMs) {
      const delayMs = cooldownMs - (now - state.lastSentAt) + this.config.delayMinutes * 60 * 1000;
      state.timer = setTimeout(() => this.executeFollowUp(conversationId), delayMs);
      return;
    }

    const delayMs = this.config.delayMinutes * 60 * 1000;
    state.timer = setTimeout(() => this.executeFollowUp(conversationId), delayMs);
  }

  cancelFollowUp(conversationId: string): void {
    const state = this.states.get(conversationId);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  onMessageReceived(
    conversationId: string,
    context: ConversationContext,
    businessConnectionId?: string
  ): void {
    if (!this.config.enabled) return;
    this.scheduleFollowUp(conversationId, context, businessConnectionId);
  }

  /**
   * Установить контекст для следующего follow-up
   * @param contextKey — viewing_time, presentation_sent, thinking, general
   */
  setFollowUpContext(conversationId: string, contextKey: string): void {
    const state = this.getOrCreateState(conversationId);
    state.lastContext = contextKey;
  }

  /**
   * Генерация и отправка follow-up сообщения
   */
  async sendFollowUp(
    conversationId: string,
    context: ConversationContext,
    businessConnectionId?: string
  ): Promise<string | null> {
    if (!this.config.enabled || !this.canSendMore(conversationId)) {
      return null;
    }

    const message = await this.generateFollowUpMessage(conversationId, context);
    if (!message) return null;

    if (this.messageSender) {
      try {
        await this.messageSender.sendTypingIndicator(conversationId, businessConnectionId);
        await this.sleep(2000 + Math.random() * 3000);
        await this.messageSender.sendMessage(conversationId, message, businessConnectionId);
      } catch (err) {
        console.error('[FollowUpService] Ошибка отправки follow-up:', err);
        return null;
      }
    }

    const state = this.getOrCreateState(conversationId);
    state.count++;
    state.lastSentAt = Date.now();

    return message;
  }

  getFollowUpCount(conversationId: string): number {
    return this.states.get(conversationId)?.count || 0;
  }

  canSendMore(conversationId: string): boolean {
    const count = this.getFollowUpCount(conversationId);
    return count < this.config.maxPerConversation;
  }

  resetState(conversationId: string): void {
    this.cancelFollowUp(conversationId);
    this.states.delete(conversationId);
  }

  destroy(): void {
    for (const [, state] of this.states) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    }
    this.states.clear();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private ---

  private async executeFollowUp(conversationId: string): Promise<void> {
    const state = this.states.get(conversationId);
    if (!state?.context) return;

    await this.sendFollowUp(conversationId, state.context, state.businessConnectionId);
  }

  private async generateFollowUpMessage(
    conversationId: string,
    context: ConversationContext
  ): Promise<string | null> {
    const state = this.states.get(conversationId);
    const contextKey = state?.lastContext;
    const count = this.getFollowUpCount(conversationId);

    // Контекстно-зависимое сообщение
    const contextMessages = this.config.contextMessages || DEFAULT_CONTEXT_MESSAGES;

    if (contextKey && contextMessages[contextKey]) {
      return contextMessages[contextKey];
    }

    // 3-й follow-up — минимальный nudge "?"
    if (count >= 2) {
      return contextMessages['minimal'] || '?';
    }

    // AI-генерация если доступна
    if (this.aiGenerator && context) {
      try {
        const lastTopic = context.currentTopic || 'аренда офиса';
        const systemPrompt = `Ты — Валерия, менеджер коворкинга ElasticSpace.
Напиши короткое follow-up сообщение (1-2 предложения) клиенту, который не отвечал некоторое время.
Сообщение должно быть:
- На "Вы"
- Ненавязчивым
- Контекстным (упомяни тему разговора)
- Без давления
- С предложением помощи

Тема последнего разговора: ${lastTopic}`;

        const response = await this.aiGenerator.generateResponse({
          message: 'Сгенерируй follow-up сообщение для клиента',
          context,
          relevantKnowledge: [],
          personality: {},
          systemPrompt,
        });

        if (response.text) return response.text;
      } catch (err) {
        console.warn('[FollowUpService] AI генерация не удалась:', err);
      }
    }

    // Шаблонные follow-up сообщения
    const templates = [
      contextMessages['general_1'] || 'Добрый день! Вы рассматривали наше предложение? Если есть вопросы — буду рада помочь!',
      contextMessages['general_2'] || 'Здравствуйте! Хотела уточнить — нужна ли Вам ещё помощь с выбором помещения?',
      contextMessages['general_3'] || 'Добрый день! Если у Вас появились вопросы по нашим предложениям, я на связи!',
    ];

    return templates[count % templates.length];
  }

  private getOrCreateState(conversationId: string): FollowUpState {
    let state = this.states.get(conversationId);
    if (!state) {
      state = {
        timer: null,
        count: 0,
        lastSentAt: 0,
        conversationId,
      };
      this.states.set(conversationId, state);
    }
    return state;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
