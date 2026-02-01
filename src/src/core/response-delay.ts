// ============================================================
// Response Delay Service — Имитация задержки чтения и набора
// ============================================================

export interface ResponseDelayConfig {
  enabled: boolean;
  readMin: number;              // мс минимальная задержка "чтения" (8000)
  readMax: number;              // мс максимальная задержка "чтения" (12000)
  typingMin: number;            // мс минимальная задержка "набора" (25000)
  typingMax: number;            // мс максимальная задержка "набора" (40000)
  typingRefreshInterval: number; // мс интервал обновления typing indicator (5000)
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
   * Расчёт задержки "чтения" сообщения
   * Зависит от длины входящего сообщения
   */
  calculateReadDelay(messageText: string): number {
    if (!this.config.enabled) return 0;

    const baseDelay = this.randomBetween(this.config.readMin, this.config.readMax);
    // Более длинные сообщения → чуть больше времени на "чтение"
    const lengthFactor = Math.min(messageText.length / 200, 1.5);
    const delay = Math.round(baseDelay * (0.8 + lengthFactor * 0.4));

    return Math.max(this.config.readMin, Math.min(delay, this.config.readMax * 1.5));
  }

  /**
   * Расчёт задержки "набора" ответа
   * Зависит от длины исходящего ответа
   */
  calculateTypingDelay(responseText: string): number {
    if (!this.config.enabled) return 0;

    const baseDelay = this.randomBetween(this.config.typingMin, this.config.typingMax);
    // Более длинные ответы → больше "набирать"
    const lengthFactor = Math.min(responseText.length / 300, 1.3);
    const delay = Math.round(baseDelay * (0.7 + lengthFactor * 0.6));

    return Math.max(this.config.typingMin, Math.min(delay, this.config.typingMax * 1.2));
  }

  /**
   * Выполнить полную задержку: чтение → typing indicator → набор
   * С периодическим обновлением typing indicator
   */
  async executeDelay(
    conversationId: string,
    businessConnectionId: string | undefined,
    incomingText: string,
    responseText: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    // 1. Задержка "чтения"
    const readDelay = this.calculateReadDelay(incomingText);
    await this.sleep(readDelay);

    // 2. Отправить typing indicator
    if (this.typingSender) {
      try {
        await this.typingSender.sendTypingIndicator(conversationId, businessConnectionId);
      } catch (err) {
        // Не критично — продолжаем
        console.warn('[ResponseDelay] Ошибка отправки typing indicator:', err);
      }
    }

    // 3. Задержка "набора" с периодическим обновлением typing
    const typingDelay = this.calculateTypingDelay(responseText);
    const refreshInterval = this.config.typingRefreshInterval;
    let elapsed = 0;

    while (elapsed < typingDelay) {
      const waitTime = Math.min(refreshInterval, typingDelay - elapsed);
      await this.sleep(waitTime);
      elapsed += waitTime;

      // Обновить typing indicator если ещё не дождались
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
