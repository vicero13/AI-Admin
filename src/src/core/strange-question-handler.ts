// ============================================================
// Strange Question Handler — Обработка нетематических вопросов (v2.0)
// Новое: двухсообщенческий паттерн ("Что?" → 5с → "Могу помочь...")
// + deferToViewing для сложных но тематических вопросов
// ============================================================

import { ConversationContext } from '../types';

export interface StrangeQuestionConfig {
  enabled: boolean;
  maxBeforeHandoff: number;         // Макс. странных вопросов до handoff (2)
  responseTemplate: string;          // Шаблон ответа "Могу ли чем-то помочь..."
  firstResponseTemplate: string;     // Первое сообщение "Что?" / "Простите?"
  deferToViewingTemplate: string;    // "Такие вопросы лучше обсудить на просмотре"
  delayBetweenMessages: number;      // мс между "Что?" и "Могу помочь..." (5000)
  allowedTopics: string[];           // Допустимые темы
}

export interface StrangeQuestionResult {
  action: 'respond' | 'handoff' | 'ignore' | 'defer_to_viewing';
  messages: StrangeMessage[];
  reason?: string;
}

export interface StrangeMessage {
  text: string;
  delayMs: number;    // Задержка перед отправкой
}

export interface StrangeQuestionAIChecker {
  generateResponse(request: {
    message: string;
    context: ConversationContext;
    relevantKnowledge: any[];
    personality: any;
    systemPrompt?: string;
  }): Promise<{ text: string }>;
}

export class StrangeQuestionHandler {
  private config: StrangeQuestionConfig;
  private aiChecker?: StrangeQuestionAIChecker;
  private strangeCounts: Map<string, number> = new Map();

  constructor(config: StrangeQuestionConfig, aiChecker?: StrangeQuestionAIChecker) {
    this.config = config;
    this.aiChecker = aiChecker;
  }

  /**
   * Проверить, является ли вопрос странным/нетематическим
   */
  async isStrangeQuestion(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    if (!this.config.enabled) return false;

    if (this.isObviouslyOnTopic(message)) return false;
    if (this.isObviouslyStrange(message)) return true;

    if (this.aiChecker) {
      try {
        return await this.checkWithAI(message, context);
      } catch (err) {
        console.warn('[StrangeQuestionHandler] AI проверка не удалась:', err);
      }
    }

    return false;
  }

  /**
   * Проверить, является ли вопрос тематическим но сложным
   * (стоит перенести на просмотр)
   */
  isDeferToViewing(message: string): boolean {
    const lower = message.toLowerCase();
    const deferPatterns = [
      /точн(ые|ая|ый)\s*(размер|площадь|планировк)/i,
      /какой именно (вид|ремонт|интерьер)/i,
      /покажите\s*(фот|реальн)/i,
      /как выглядит (офис|помещение|кабинет)\s*вживую/i,
      /можно\s*(потрогать|пощупать|увидеть)/i,
      /нужно увидеть/i,
    ];
    return deferPatterns.some(p => p.test(lower));
  }

  getStrangeCount(conversationId: string): number {
    return this.strangeCounts.get(conversationId) || 0;
  }

  /**
   * Обработать странный вопрос — двухсообщенческий паттерн:
   * 1-й раз: "Что?" → пауза → "Могу ли чем-то помочь..."
   * 2-й раз: handoff
   */
  handleStrange(conversationId: string): StrangeQuestionResult {
    if (!this.config.enabled) {
      return { action: 'ignore', messages: [] };
    }

    const currentCount = this.getStrangeCount(conversationId) + 1;
    this.strangeCounts.set(conversationId, currentCount);

    if (currentCount >= this.config.maxBeforeHandoff) {
      return {
        action: 'handoff',
        reason: 'repeated_strange_questions',
        messages: [
          {
            text: 'Кажется, у Вас нетипичный вопрос. Давайте я передам Вас коллеге, который сможет лучше помочь.',
            delayMs: 0,
          },
        ],
      };
    }

    // Двухсообщенческий паттерн
    const firstMsg = this.config.firstResponseTemplate || 'Что?';
    const secondMsg = this.config.responseTemplate ||
      'Извините, я специализируюсь на вопросах о коворкинге и аренде. Могу ли я помочь Вам с чем-то в этой области?';
    const delay = this.config.delayBetweenMessages || 5000;

    return {
      action: 'respond',
      messages: [
        { text: firstMsg, delayMs: 0 },
        { text: secondMsg, delayMs: delay },
      ],
    };
  }

  /**
   * Обработать вопрос, который лучше обсудить на просмотре
   */
  handleDeferToViewing(): StrangeQuestionResult {
    return {
      action: 'defer_to_viewing',
      messages: [
        {
          text: this.config.deferToViewingTemplate ||
            'Такие детали лучше обсудить на просмотре — так Вы сможете всё увидеть своими глазами ) Хотите записаться?',
          delayMs: 0,
        },
      ],
    };
  }

  resetCount(conversationId: string): void {
    this.strangeCounts.delete(conversationId);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private helpers ---

  private isObviouslyOnTopic(message: string): boolean {
    const lower = message.toLowerCase();

    const onTopicKeywords = [
      'аренда', 'аренду', 'арендовать', 'офис', 'коворкинг',
      'цена', 'стоимость', 'тариф', 'прайс',
      'адрес', 'как добраться', 'где находи',
      'парковка', 'метро', 'переговорн',
      'бронир', 'просмотр', 'тур',
      'договор', 'оплата', 'счёт', 'счет',
      'мест', 'рабочее место', 'стол',
      'кондиционер', 'интернет', 'wifi', 'wi-fi',
      'кухня', 'кофе', 'принтер', 'скан',
      'график', 'режим', 'время работы',
      'доступ', 'ключ', 'карт',
      ...this.config.allowedTopics.map((t) => t.toLowerCase()),
    ];

    return onTopicKeywords.some((kw) => lower.includes(kw));
  }

  private isObviouslyStrange(message: string): boolean {
    const lower = message.toLowerCase();

    const strangePatterns = [
      /расскажи анекдот/i,
      /спой песню/i,
      /стих(и|отворение)/i,
      /сколько тебе лет/i,
      /ты замужем/i,
      /ты женат/i,
      /какой у тебя знак зодиака/i,
      /рецепт/i,
      /прогноз погоды/i,
      /курс (доллар|евро|валют)/i,
      /результат (матч|игр)/i,
      /политик/i,
    ];

    return strangePatterns.some((p) => p.test(lower));
  }

  private async checkWithAI(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    const systemPrompt = `Ты — фильтр вопросов для коворкинга ElasticSpace.
Определи, является ли вопрос клиента тематическим (связан с коворкингом, арендой, офисами, услугами) или нетематическим (странный, не по теме).

Тематические темы:
- Аренда офисов, рабочих мест, переговорных
- Цены, тарифы, условия
- Расположение, адрес, как добраться
- Услуги коворкинга (интернет, кухня, парковка)
- Бронирование, просмотры
- Технические вопросы резидентов
- Общие приветствия и прощания

Нетематические темы:
- Личные вопросы к менеджеру
- Просьбы, не связанные с бизнесом
- Шутки, мемы, анекдоты
- Политика, религия
- Запросы не связанные с недвижимостью

Ответь ТОЛЬКО "YES" (странный/нетематический) или "NO" (тематический).`;

    const response = await this.aiChecker!.generateResponse({
      message: `Вопрос клиента: "${message}"`,
      context,
      relevantKnowledge: [],
      personality: {},
      systemPrompt,
    });

    return response.text.trim().toUpperCase().startsWith('YES');
  }
}
