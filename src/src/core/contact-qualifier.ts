// ============================================================
// Contact Qualifier — Классификация типа контакта (v2.0)
// Новое: folder-based detection, name pattern detection ("Ксения 307")
// ============================================================

import { ConversationContext, ContextMessage, MessageRole } from '../types';

export enum ContactType {
  CLIENT = 'CLIENT',
  BROKER = 'BROKER',
  RESIDENT = 'RESIDENT',
  SUPPLIER = 'SUPPLIER',
  SPAM = 'SPAM',
  UNKNOWN = 'UNKNOWN',
}

export interface HandlingStrategy {
  type: ContactType;
  allowFullService: boolean;
  limitedTopics?: string[];
  handoffToManager: boolean;
  ignoreMessages: boolean;
  additionalInstructions: string;
}

export interface QualifierConfig {
  enabled: boolean;
  classifyAfterMessages: number;    // Классифицировать после N сообщений
  spamKeywords: string[];
  brokerKeywords: string[];
  residentKeywords: string[];
  supplierKeywords: string[];
  // Новое: folder-based detection
  residentFolders: string[];        // Имена папок резидентов в Telegram
  // Новое: паттерны офисных номеров в имени ("Ксения 307")
  officeNumberInName: boolean;
}

export interface QualifierAIClassifier {
  generateResponse(request: {
    message: string;
    context: ConversationContext;
    relevantKnowledge: any[];
    personality: any;
    systemPrompt?: string;
  }): Promise<{ text: string }>;
}

const DEFAULT_SPAM_KEYWORDS = [
  'казино', 'ставки', 'заработок без вложений', 'пассивный доход',
  'крипто', 'bitcoin', 'инвестиц', 'forex', 'млм', 'mlm',
  'похудеть', 'бесплатно', 'акция', 'розыгрыш', 'выигрыш',
];

const DEFAULT_BROKER_KEYWORDS = [
  'агент', 'брокер', 'партнёрск', 'комиссия', 'сотрудничество',
  'коммерческое предложение', 'кп', 'представляю компанию',
  'предлагаем', 'оптовый',
];

const DEFAULT_RESIDENT_KEYWORDS = [
  'резидент', 'арендатор', 'мы у вас', 'мы арендуем',
  'наш офис', 'проблема с', 'не работает', 'сломалось',
  'кондиционер', 'интернет', 'уборка', 'ключ',
];

const DEFAULT_SUPPLIER_KEYWORDS = [
  'поставщик', 'поставка', 'прайс-лист', 'каталог',
  'оборудование', 'мебель', 'канцелярия', 'вода',
  'клининг', 'обслуживание',
];

// Паттерн номера офиса в имени (например "Ксения 307", "Иван каб 12")
const OFFICE_NUMBER_PATTERN = /\b\d{1,4}\b/;

export class ContactQualifier {
  private config: QualifierConfig;
  private aiClassifier?: QualifierAIClassifier;
  private classificationCache: Map<string, ContactType> = new Map();

  constructor(config: QualifierConfig, aiClassifier?: QualifierAIClassifier) {
    this.config = config;
    this.aiClassifier = aiClassifier;
  }

  /**
   * Классифицировать контакт по сообщениям
   */
  async classify(
    messages: ContextMessage[],
    context: ConversationContext
  ): Promise<ContactType> {
    if (!this.config.enabled) return ContactType.CLIENT;

    // Проверяем кэш
    const cached = this.classificationCache.get(context.conversationId);
    if (cached) return cached;

    // Ждём достаточно сообщений для классификации
    const userMessages = messages.filter((m) => m.role === MessageRole.USER);
    if (userMessages.length < this.config.classifyAfterMessages) {
      return ContactType.UNKNOWN;
    }

    // 0. Проверка по папке (Telegram folders)
    const folderType = this.classifyByFolder(context);
    if (folderType !== ContactType.UNKNOWN) {
      this.classificationCache.set(context.conversationId, folderType);
      return folderType;
    }

    // 0.5. Проверка номера офиса в имени
    if (this.config.officeNumberInName) {
      const nameType = this.classifyByName(context);
      if (nameType !== ContactType.UNKNOWN) {
        this.classificationCache.set(context.conversationId, nameType);
        return nameType;
      }
    }

    // 1. Эвристическая классификация
    const heuristicResult = this.classifyByHeuristics(userMessages);
    if (heuristicResult !== ContactType.UNKNOWN) {
      this.classificationCache.set(context.conversationId, heuristicResult);
      return heuristicResult;
    }

    // 2. AI-классификация
    if (this.aiClassifier) {
      try {
        const aiResult = await this.classifyByAI(userMessages, context);
        if (aiResult !== ContactType.UNKNOWN) {
          this.classificationCache.set(context.conversationId, aiResult);
          return aiResult;
        }
      } catch (err) {
        console.warn('[ContactQualifier] AI классификация не удалась:', err);
      }
    }

    // По умолчанию — клиент
    const defaultType = ContactType.CLIENT;
    this.classificationCache.set(context.conversationId, defaultType);
    return defaultType;
  }

  /**
   * Классификация по папке в Telegram
   */
  private classifyByFolder(context: ConversationContext): ContactType {
    const folder = context.metadata?.telegramFolder as string | undefined;
    if (!folder) return ContactType.UNKNOWN;

    const residentFolders = this.config.residentFolders || [];
    if (residentFolders.some(f => folder.toLowerCase().includes(f.toLowerCase()))) {
      return ContactType.RESIDENT;
    }

    return ContactType.UNKNOWN;
  }

  /**
   * Классификация по номеру офиса в имени пользователя
   * Например: "Ксения 307" → RESIDENT
   */
  private classifyByName(context: ConversationContext): ContactType {
    const name = context.clientProfile?.name;
    if (!name) return ContactType.UNKNOWN;

    if (OFFICE_NUMBER_PATTERN.test(name)) {
      return ContactType.RESIDENT;
    }

    return ContactType.UNKNOWN;
  }

  getHandlingStrategy(type: ContactType): HandlingStrategy {
    switch (type) {
      case ContactType.CLIENT:
        return {
          type: ContactType.CLIENT,
          allowFullService: true,
          handoffToManager: false,
          ignoreMessages: false,
          additionalInstructions: 'Полный сервис. Помоги клиенту выбрать подходящее помещение и записаться на просмотр.',
        };

      case ContactType.BROKER:
        return {
          type: ContactType.BROKER,
          allowFullService: false,
          limitedTopics: ['общая информация', 'контакт менеджера'],
          handoffToManager: true,
          ignoreMessages: false,
          additionalInstructions: 'Это брокер/агент. Дай общую информацию и предложи связаться с менеджером для обсуждения условий сотрудничества.',
        };

      case ContactType.RESIDENT:
        return {
          type: ContactType.RESIDENT,
          allowFullService: true,
          limitedTopics: ['техподдержка', 'сервис', 'бронирования', 'мероприятия'],
          handoffToManager: false,
          ignoreMessages: false,
          additionalInstructions: 'Это текущий резидент/арендатор. Помоги с вопросами по обслуживанию, бронированиям переговорных и техническим проблемам.',
        };

      case ContactType.SUPPLIER:
        return {
          type: ContactType.SUPPLIER,
          allowFullService: false,
          limitedTopics: ['контакт менеджера'],
          handoffToManager: true,
          ignoreMessages: false,
          additionalInstructions: 'Это поставщик. Вежливо откажи и предложи связаться с менеджером по email.',
        };

      case ContactType.SPAM:
        return {
          type: ContactType.SPAM,
          allowFullService: false,
          handoffToManager: false,
          ignoreMessages: true,
          additionalInstructions: '',
        };

      default:
        return {
          type: ContactType.UNKNOWN,
          allowFullService: true,
          handoffToManager: false,
          ignoreMessages: false,
          additionalInstructions: 'Тип контакта пока неизвестен. Общайся стандартно.',
        };
    }
  }

  shouldIgnore(type: ContactType): boolean {
    return type === ContactType.SPAM;
  }

  getCachedType(conversationId: string): ContactType | undefined {
    return this.classificationCache.get(conversationId);
  }

  resetClassification(conversationId: string): void {
    this.classificationCache.delete(conversationId);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private helpers ---

  private classifyByHeuristics(messages: ContextMessage[]): ContactType {
    const allText = messages.map((m) => m.content.toLowerCase()).join(' ');

    const spamKeywords = this.config.spamKeywords.length > 0
      ? this.config.spamKeywords
      : DEFAULT_SPAM_KEYWORDS;
    const spamScore = this.countKeywordMatches(allText, spamKeywords);
    if (spamScore >= 2) return ContactType.SPAM;

    const brokerKeywords = this.config.brokerKeywords.length > 0
      ? this.config.brokerKeywords
      : DEFAULT_BROKER_KEYWORDS;
    const brokerScore = this.countKeywordMatches(allText, brokerKeywords);
    if (brokerScore >= 2) return ContactType.BROKER;

    const residentKeywords = this.config.residentKeywords.length > 0
      ? this.config.residentKeywords
      : DEFAULT_RESIDENT_KEYWORDS;
    const residentScore = this.countKeywordMatches(allText, residentKeywords);
    if (residentScore >= 2) return ContactType.RESIDENT;

    const supplierKeywords = this.config.supplierKeywords.length > 0
      ? this.config.supplierKeywords
      : DEFAULT_SUPPLIER_KEYWORDS;
    const supplierScore = this.countKeywordMatches(allText, supplierKeywords);
    if (supplierScore >= 2) return ContactType.SUPPLIER;

    return ContactType.UNKNOWN;
  }

  private async classifyByAI(
    messages: ContextMessage[],
    context: ConversationContext
  ): Promise<ContactType> {
    const messagesText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Ты — классификатор контактов коворкинга. Проанализируй сообщения и определи тип контакта.
Возможные типы:
- CLIENT — потенциальный клиент, ищет помещение для аренды
- BROKER — агент/брокер недвижимости, ищет партнёрство
- RESIDENT — текущий арендатор/резидент с вопросом
- SUPPLIER — поставщик услуг/товаров
- SPAM — спам, нерелевантное сообщение
- UNKNOWN — не удаётся определить

Ответь JSON: {"type": "CLIENT", "confidence": 0.9, "reason": "..."}`;

    const response = await this.aiClassifier!.generateResponse({
      message: `Сообщения клиента:\n${messagesText}`,
      context,
      relevantKnowledge: [],
      personality: {},
      systemPrompt,
    });

    // Попробовать распарсить JSON
    try {
      const parsed = JSON.parse(response.text.trim());
      if (parsed.type && Object.values(ContactType).includes(parsed.type as ContactType)) {
        return parsed.type as ContactType;
      }
    } catch {
      // Fallback на простой текст
      const result = response.text.trim().toUpperCase();
      if (Object.values(ContactType).includes(result as ContactType)) {
        return result as ContactType;
      }
    }

    return ContactType.UNKNOWN;
  }

  private countKeywordMatches(text: string, keywords: string[]): number {
    return keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  }
}
