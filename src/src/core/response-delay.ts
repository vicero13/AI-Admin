// ============================================================
// Response Delay Service — Имитация задержки чтения и набора
//
// Модель задержек (от момента получения первого сообщения):
//
// Обычное сообщение:
//   - Typing через 5-10с от первого сообщения
//   - Ответ через 31-50с от первого сообщения (зависит от длины ответа)
//   - Batch в orchestrator уже ждёт 30с, поэтому тут добавляем остаток
//
// Приветствие:
//   - Typing через 5-10с от сообщения
//   - Ответ через 10-15с от сообщения
// ============================================================

export interface ResponseDelayConfig {
  enabled: boolean;
  // Задержка до показа "печатает..." (одинаково для всех)
  typingShowMin: number;         // мс (5000)
  typingShowMax: number;         // мс (10000)
  // Задержка "набора" для обычных сообщений (после typing indicator)
  typingMin: number;             // мс минимальная задержка "набора" (1000)
  typingMax: number;             // мс максимальная задержка "набора" (20000)
  // Задержка "набора" для приветствий (после typing indicator)
  greetingTypingMin: number;     // мс (3000)
  greetingTypingMax: number;     // мс (5000)
  typingRefreshInterval: number; // мс интервал обновления typing indicator (5000)
  // Legacy fields (не используются, но чтоб не ломать конфиг)
  readMin?: number;
  readMax?: number;
}

export interface TypingIndicatorSender {
  sendTypingIndicator(conversationId: string, businessConnectionId?: string): Promise<void>;
}

export class ResponseDelayService {
  private config: ResponseDelayConfig;
  private typingSender?: TypingIndicatorSender;

  constructor(config: ResponseDelayConfig, typingSender?: TypingIndicatorSender) {
    this.config = config;
    this.typingSender = typingSender;
  }

  /**
   * Выполнить задержку перед отправкой ответа.
   *
   * Учитывает время, уже прошедшее с момента получения первого сообщения (batch wait + AI processing).
   *
   * Целевые тайминги от первого сообщения:
   *   Приветствие: typing ~5-10с, ответ ~10-15с
   *   Обычное:    typing ~5-10с, ответ ~31-50с
   */
  async executeDelay(
    conversationId: string,
    businessConnectionId: string | undefined,
    _incomingText: string,
    responseText: string,
    isGreeting?: boolean,
    firstMessageReceivedAt?: number
  ): Promise<void> {
    if (!this.config.enabled) return;

    const now = Date.now();
    const messageAge = firstMessageReceivedAt ? (now - firstMessageReceivedAt) : 0;

    // --- Целевые тайминги от первого сообщения ---
    const typingShowTarget = this.randomBetween(
      this.config.typingShowMin ?? 5000,
      this.config.typingShowMax ?? 10000
    );

    let totalTarget: number;
    if (isGreeting) {
      // Приветствие: итого 10-15с
      totalTarget = typingShowTarget + this.randomBetween(
        this.config.greetingTypingMin ?? 3000,
        this.config.greetingTypingMax ?? 5000
      );
    } else {
      // Обычное: итого 31-50с (зависит от длины)
      const minTotal = 31000;
      const maxTotal = 50000;
      const lengthRatio = Math.min(responseText.length / 500, 1.0);
      const baseTotal = minTotal + (maxTotal - minTotal) * lengthRatio;
      const variation = this.randomFloat(0.9, 1.1);
      totalTarget = Math.round(baseTotal * variation);
      totalTarget = Math.max(minTotal, Math.min(totalTarget, maxTotal));
    }

    // --- Сколько ещё ждать с учётом уже прошедшего времени ---

    // 1. Typing indicator: показать когда пройдёт typingShowTarget от первого сообщения
    const typingWait = Math.max(0, typingShowTarget - messageAge);

    if (typingWait > 0) {
      await this.sleep(typingWait);
    }

    // Отправить typing indicator
    if (this.typingSender) {
      try {
        await this.typingSender.sendTypingIndicator(conversationId, businessConnectionId);
      } catch (err) {
        console.warn('[ResponseDelay] Ошибка отправки typing indicator:', err);
      }
    }

    // 2. Набор: ждём до totalTarget от первого сообщения
    const elapsedAfterTyping = firstMessageReceivedAt
      ? (Date.now() - firstMessageReceivedAt)
      : (messageAge + typingWait);
    const typingDelay = Math.max(1000, totalTarget - elapsedAfterTyping); // минимум 1с набора

    // Периодически обновляем typing indicator
    const refreshInterval = this.config.typingRefreshInterval ?? 5000;
    let elapsed = 0;

    while (elapsed < typingDelay) {
      const waitTime = Math.min(refreshInterval, typingDelay - elapsed);
      await this.sleep(waitTime);
      elapsed += waitTime;

      if (elapsed < typingDelay && this.typingSender) {
        try {
          await this.typingSender.sendTypingIndicator(conversationId, businessConnectionId);
        } catch {
          // Игнорируем ошибки typing indicator
        }
      }
    }
  }

  /**
   * Проверка: включен ли сервис
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private helpers ---

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
