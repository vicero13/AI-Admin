// ============================================================
// Greeting Service — Приветствие контактов (v2.0)
// Поддерживает: full/short/none, emoji randomization, шаблоны
// ============================================================

import { ConversationContext } from '../types';

export interface GreetingConfig {
  enabled: boolean;
  template: string;               // "Добрый день, {name}!\nЭто Валерия, администратор..."
  templateNoName?: string;        // "Добрый день!\nЭто Валерия, администратор..."
  shortTemplate: string;          // "Добрый день, {name}!"
  shortTemplateNoName?: string;   // "Добрый день!"
  useAI: boolean;                 // Генерировать через AI или использовать шаблон
  agentName: string;              // Имя агента для подстановки
  emojis: string[];               // ["🐱", "😊", "🌸", "💚", "🤗"]
}

export type GreetingType = 'full' | 'short' | 'none';

export interface GreetingAIGenerator {
  generateResponse(request: {
    message: string;
    context: ConversationContext;
    relevantKnowledge: any[];
    personality: any;
    systemPrompt?: string;
  }): Promise<{ text: string }>;
}

export class GreetingService {
  private config: GreetingConfig;
  private aiGenerator?: GreetingAIGenerator;

  constructor(config: GreetingConfig, aiGenerator?: GreetingAIGenerator) {
    this.config = config;
    this.aiGenerator = aiGenerator;
  }

  /**
   * Определить, является ли контакт новым (нет истории сообщений)
   */
  isNewContact(context: ConversationContext): boolean {
    return context.messageHistory.length <= 1;
  }

  /**
   * Сгенерировать приветственное сообщение по типу
   * @param type - full (новый контакт), short (новый день), none (продолжение)
   */
  async generateGreeting(
    userName?: string,
    context?: ConversationContext,
    type: GreetingType = 'full'
  ): Promise<string> {
    if (!this.config.enabled || type === 'none') {
      return '';
    }

    const cleanName = userName ? this.validateName(userName) : null;

    // Short greeting — только короткий шаблон
    if (type === 'short') {
      const shortTpl = cleanName
        ? (this.config.shortTemplate || 'Добрый день, {name}!')
        : (this.config.shortTemplateNoName || this.config.shortTemplate || 'Добрый день!');
      return this.applyTemplate(shortTpl, cleanName);
    }

    // Full greeting — AI или шаблон
    if (this.config.useAI && this.aiGenerator && context) {
      try {
        const prompt = this.buildGreetingPrompt(cleanName);
        const response = await this.aiGenerator.generateResponse({
          message: prompt,
          context,
          relevantKnowledge: [],
          personality: {},
          systemPrompt: this.buildGreetingSystemPrompt(cleanName),
        });
        if (response.text) return response.text;
      } catch (err) {
        console.warn('[GreetingService] AI генерация не удалась, используем шаблон:', err);
      }
    }

    // Шаблонное приветствие — с именем или без
    const fullTpl = cleanName
      ? this.config.template
      : (this.config.templateNoName || this.config.template);
    return this.applyTemplate(fullTpl, cleanName);
  }

  /**
   * Валидация имени — фильтрация ботов и спама
   */
  validateName(name: string): string | null {
    if (!name || name.trim().length === 0) return null;

    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 50) return null;

    const suspiciousPatterns = [
      /^bot/i,
      /^test/i,
      /^user\d+/i,
      /^\d+$/,
      /^[a-z0-9_]+$/i,
      /https?:\/\//i,
      /[<>{}[\]]/,
      /admin|root|system/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmed)) return null;
    }

    // Берём только первое слово (имя без фамилии)
    const firstName = trimmed.split(/\s+/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  /**
   * Получить случайный emoji из списка
   */
  getRandomEmoji(): string {
    const emojis = this.config.emojis && this.config.emojis.length > 0
      ? this.config.emojis
      : ['😊', '🤗', '👋', '✨', '💫'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  updateConfig(config: GreetingConfig): void {
    this.config = config;
  }

  // --- Private helpers ---

  private applyTemplate(template: string, name: string | null): string {
    let text = template;

    // Заменить {{emoji}} на случайный emoji
    text = text.replace(/\{\{emoji\}\}/g, () => this.getRandomEmoji());

    if (name) {
      text = text.replace(/{name}/g, name);
    } else {
      text = text.replace(/,?\s*{name}/g, '');
      text = text.replace(/{name},?\s*/g, '');
    }

    return text.trim();
  }

  private buildGreetingPrompt(name: string | null): string {
    if (name) {
      return `Поприветствуй нового клиента по имени ${name}. Представься как ${this.config.agentName}. Будь дружелюбным и профессиональным. 1-2 предложения. Обращение на "Вы".`;
    }
    return `Поприветствуй нового клиента. Представься как ${this.config.agentName}. Будь дружелюбным и профессиональным. 1-2 предложения. Обращение на "Вы".`;
  }

  private buildGreetingSystemPrompt(name: string | null): string {
    return [
      `Ты — ${this.config.agentName}, администратор коворкинга ElasticSpace.`,
      'Ты настоящий живой человек, сотрудник компании.',
      'Напиши короткое приветственное сообщение (1-2 предложения).',
      'Используй формальное обращение на "Вы".',
      'Можно добавить 1 смайлик в скобках типа )',
      name ? `Обратись к клиенту по имени: ${name}.` : 'Имя клиента неизвестно.',
      'Предложи помощь.',
    ].join('\n');
  }
}
