// ============================================================
// Operator Request Handler — Обработка запросов на оператора
// Handles: "ты бот?", "позови оператора", "хочу говорить с человеком"
// ============================================================

import { ConversationContext } from '../types';

export interface OperatorRequestConfig {
  enabled: boolean;
  // Паттерны запроса оператора
  operatorPatterns: string[];
  // Паттерны "ты бот?"
  botQuestionPatterns: string[];
  // Шаблоны ответов
  replyToGreeting: string;          // "Это я писала Вам ранее 😊"
  offerManager: string;             // "Хотите, переключу на руководителя?"
  transferMessage: string;          // "Хорошо, сейчас переключу!"
  notBotResponse: string;           // "Нет, я менеджер ElasticSpace..."
  // Задержки (мс)
  delayBeforeOffer: number;         // 10000 (10с)
  delayBeforeTransfer: number;      // 15000 (15с)
}

export interface OperatorRequestResult {
  action: 'reply_greeting' | 'offer_manager' | 'transfer' | 'not_bot' | 'ignore';
  messages: OperatorMessage[];
  handoff: boolean;
}

export interface OperatorMessage {
  text: string;
  delayMs: number;     // Задержка перед отправкой
}

export class OperatorRequestHandler {
  private config: OperatorRequestConfig;
  // Состояние по conversationId: этап обработки
  private states: Map<string, OperatorRequestState> = new Map();

  constructor(config: OperatorRequestConfig) {
    this.config = config;
  }

  /**
   * Определить, является ли сообщение запросом оператора
   */
  isOperatorRequest(message: string): boolean {
    if (!this.config.enabled) return false;
    const lower = message.toLowerCase().trim();

    return this.matchesPatterns(lower, this.config.operatorPatterns);
  }

  /**
   * Определить, является ли сообщение вопросом "ты бот?"
   */
  isBotQuestion(message: string): boolean {
    if (!this.config.enabled) return false;
    const lower = message.toLowerCase().trim();

    return this.matchesPatterns(lower, this.config.botQuestionPatterns);
  }

  /**
   * Обработать запрос "ты бот?"
   * Возвращает ответ "Нет, я менеджер..."
   */
  handleBotQuestion(_conversationId: string): OperatorRequestResult {
    if (!this.config.enabled) {
      return { action: 'ignore', messages: [], handoff: false };
    }

    return {
      action: 'not_bot',
      messages: [
        { text: this.config.notBotResponse, delayMs: 0 },
      ],
      handoff: false,
    };
  }

  /**
   * Обработать запрос оператора — многошаговый диалог:
   * 1. Ответ на приветствие → "Это я писала Вам ранее"
   * 2. Через delayBeforeOffer мс → "Хотите, переключу на руководителя?"
   * 3. При подтверждении → "Хорошо, сейчас переключу!" → handoff
   */
  handleOperatorRequest(conversationId: string): OperatorRequestResult {
    if (!this.config.enabled) {
      return { action: 'ignore', messages: [], handoff: false };
    }

    const state = this.getState(conversationId);

    if (state.stage === 'none' || state.stage === 'initial') {
      // Первый запрос → ответ + предложение менеджера
      state.stage = 'offered';
      this.states.set(conversationId, state);

      return {
        action: 'offer_manager',
        messages: [
          { text: this.config.replyToGreeting, delayMs: 0 },
          { text: this.config.offerManager, delayMs: this.config.delayBeforeOffer },
        ],
        handoff: false,
      };
    }

    if (state.stage === 'offered') {
      // Повторный запрос или подтверждение → переключение
      state.stage = 'transferred';
      this.states.set(conversationId, state);

      return {
        action: 'transfer',
        messages: [
          { text: this.config.transferMessage, delayMs: this.config.delayBeforeTransfer },
        ],
        handoff: true,
      };
    }

    // Уже перевели
    return { action: 'ignore', messages: [], handoff: false };
  }

  /**
   * Проверить, является ли ответ подтверждением перевода на менеджера
   */
  isTransferConfirmation(message: string, conversationId: string): boolean {
    const state = this.getState(conversationId);
    if (state.stage !== 'offered') return false;

    const lower = message.toLowerCase().trim();
    const confirmPatterns = [
      /^да/i,
      /^конечно/i,
      /^хочу/i,
      /^давайте/i,
      /^пожалуйста/i,
      /переключ/i,
      /оператор/i,
      /менеджер/i,
      /руководител/i,
      /человек/i,
    ];

    return confirmPatterns.some(p => p.test(lower));
  }

  /**
   * Сбросить состояние для разговора
   */
  resetState(conversationId: string): void {
    this.states.delete(conversationId);
  }

  /**
   * Получить текущий этап
   */
  getStage(conversationId: string): string {
    return this.getState(conversationId).stage;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private ---

  private getState(conversationId: string): OperatorRequestState {
    return this.states.get(conversationId) || { stage: 'none', lastAction: 0 };
  }

  private matchesPatterns(text: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Поддержка regex-like паттернов (начинающихся с /)
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        try {
          const regex = new RegExp(pattern.slice(1, -1), 'i');
          if (regex.test(text)) return true;
        } catch {
          // Fallback на простое включение
          if (text.includes(pattern.toLowerCase())) return true;
        }
      } else {
        if (text.includes(pattern.toLowerCase())) return true;
      }
    }
    return false;
  }
}

interface OperatorRequestState {
  stage: 'none' | 'initial' | 'offered' | 'transferred';
  lastAction: number;
}
