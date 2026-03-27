// ============================================================
// Summary Service — Резюме разговора и уведомление админу (v2.0)
// Новое: viewing date/time/location extraction, detailed notification
// ============================================================

import { ConversationContext, MessageRole } from '../types';

export interface SummaryConfig {
  enabled: boolean;
  notifyOnViewing: boolean;       // Уведомлять при подтверждении просмотра
  notificationChannel: string;    // "telegram"
}

export interface ConversationSummary {
  conversationId: string;
  clientName?: string;
  clientContact?: string;
  interestedIn: string;
  budget?: string;
  keyRequirements: string[];
  viewingConfirmed: boolean;
  viewingDate?: string;            // Дата просмотра если обсуждалась
  viewingTime?: string;            // Время просмотра
  viewingLocation?: string;        // Локация просмотра
  summaryText: string;
  timestamp: number;
}

export interface SummaryAIGenerator {
  generateResponse(request: {
    message: string;
    context: ConversationContext;
    relevantKnowledge: any[];
    personality: any;
    systemPrompt?: string;
  }): Promise<{ text: string }>;
}

export interface SummaryNotifier {
  (message: string, priority: string): Promise<void>;
}

export class SummaryService {
  private config: SummaryConfig;
  private aiGenerator?: SummaryAIGenerator;
  private notifier?: SummaryNotifier;

  constructor(
    config: SummaryConfig,
    aiGenerator?: SummaryAIGenerator,
    notifier?: SummaryNotifier
  ) {
    this.config = config;
    this.aiGenerator = aiGenerator;
    this.notifier = notifier;
  }

  /**
   * Определить, подтвердил ли клиент просмотр объекта
   */
  async detectViewingConfirmation(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    if (!this.config.enabled || !this.config.notifyOnViewing) return false;

    if (this.isViewingConfirmationByKeywords(message)) return true;

    if (this.aiGenerator) {
      try {
        return await this.checkViewingWithAI(message, context);
      } catch (err) {
        console.warn('[SummaryService] AI проверка не удалась:', err);
      }
    }

    return false;
  }

  /**
   * Сгенерировать резюме разговора
   */
  async generateSummary(context: ConversationContext): Promise<ConversationSummary> {
    if (this.aiGenerator) {
      try {
        return await this.generateSummaryWithAI(context);
      } catch (err) {
        console.warn('[SummaryService] AI генерация резюме не удалась:', err);
      }
    }

    return this.generateSimpleSummary(context);
  }

  /**
   * Уведомить админа о подтверждении просмотра
   */
  async notifyAdmin(summary: ConversationSummary): Promise<void> {
    if (!this.notifier) {
      console.log('[SummaryService] Нет notifier, резюме:', summary.summaryText);
      return;
    }

    const notification = this.formatNotification(summary);
    await this.notifier(notification, 'high');
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  updateConfig(config: SummaryConfig): void {
    this.config = config;
  }

  // --- Private helpers ---

  private isViewingConfirmationByKeywords(message: string): boolean {
    const lower = message.toLowerCase();

    const confirmationPatterns = [
      /хо(чу|тел[аи]?\s*(бы)?)\s*(посмотреть|записаться|приехать|приду)/i,
      /запиши(те)?\s*(меня)?\s*(на\s*просмотр)/i,
      /когда\s*(можно|могу)\s*(приехать|прийти|посмотреть)/i,
      /давайте\s*(запишусь|запишемся|посмотрим)/i,
      /готов[а]?\s*(приехать|посмотреть|записаться)/i,
      /подъеду/i,
      /приеду\s*(посмотреть|на\s*просмотр)/i,
      /да,?\s*(давайте|хочу|запишите)/i,
      /записаться на просмотр/i,
      /хочу посмотреть (квартиру|офис|помещение)/i,
    ];

    return confirmationPatterns.some((p) => p.test(lower));
  }

  private async checkViewingWithAI(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    const recentMessages = context.messageHistory
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Ты — анализатор диалогов коворкинга ElasticSpace.
Определи, подтверждает ли клиент желание записаться на просмотр объекта или офиса.

Подтверждение может быть:
- Прямое: "Хочу посмотреть", "Запишите на просмотр"
- Косвенное: "Когда можно приехать?", "Давайте в среду"
- Согласие на предложение менеджера: "Да, давайте"

НЕ является подтверждением:
- Вопросы о наличии
- Запросы информации
- Общие вопросы

Контекст разговора:
${recentMessages}

Ответь ТОЛЬКО "YES" или "NO".`;

    const response = await this.aiGenerator!.generateResponse({
      message: `Последнее сообщение клиента: "${message}"`,
      context,
      relevantKnowledge: [],
      personality: {},
      systemPrompt,
    });

    return response.text.trim().toUpperCase().startsWith('YES');
  }

  private async generateSummaryWithAI(
    context: ConversationContext
  ): Promise<ConversationSummary> {
    const messagesText = context.messageHistory
      .map((m) => `${m.role === MessageRole.USER ? 'Клиент' : 'Менеджер'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Проанализируй диалог и создай JSON-резюме со следующими полями:
{
  "clientName": "имя клиента если известно или null",
  "clientContact": "контакт если упоминался или null",
  "interestedIn": "что интересует клиента",
  "budget": "бюджет если обсуждался или null",
  "keyRequirements": ["массив ключевых пожеланий"],
  "viewingConfirmed": true/false,
  "viewingDate": "дата просмотра если обсуждалась или null",
  "viewingTime": "время просмотра если обсуждалось или null",
  "viewingLocation": "локация/адрес просмотра если обсуждался или null",
  "summaryText": "краткое текстовое резюме для менеджера (2-3 предложения)"
}

Ответь ТОЛЬКО валидным JSON.`;

    const response = await this.aiGenerator!.generateResponse({
      message: `Диалог:\n${messagesText}`,
      context,
      relevantKnowledge: [],
      personality: {},
      systemPrompt,
    });

    try {
      const parsed = JSON.parse(response.text);
      return {
        conversationId: context.conversationId,
        clientName: parsed.clientName || undefined,
        clientContact: parsed.clientContact || undefined,
        interestedIn: parsed.interestedIn || 'Не указано',
        budget: parsed.budget || undefined,
        keyRequirements: Array.isArray(parsed.keyRequirements) ? parsed.keyRequirements : [],
        viewingConfirmed: !!parsed.viewingConfirmed,
        viewingDate: parsed.viewingDate || undefined,
        viewingTime: parsed.viewingTime || undefined,
        viewingLocation: parsed.viewingLocation || undefined,
        summaryText: parsed.summaryText || 'Резюме недоступно',
        timestamp: Date.now(),
      };
    } catch {
      return this.generateSimpleSummary(context);
    }
  }

  private generateSimpleSummary(context: ConversationContext): ConversationSummary {
    const userMessages = context.messageHistory.filter(
      (m) => m.role === MessageRole.USER
    );

    const summaryText = userMessages.length > 0
      ? `Клиент отправил ${userMessages.length} сообщений. Тема: ${context.currentTopic || 'не определена'}.`
      : 'Нет сообщений от клиента.';

    return {
      conversationId: context.conversationId,
      clientName: context.clientProfile?.name,
      interestedIn: context.currentTopic || 'Не указано',
      keyRequirements: [],
      viewingConfirmed: false,
      summaryText,
      timestamp: Date.now(),
    };
  }

  private formatNotification(summary: ConversationSummary): string {
    const lines: string[] = [
      '🏢 *Новая заявка на просмотр*',
      '',
    ];

    if (summary.clientName) {
      lines.push(`👤 Клиент: ${summary.clientName}`);
    }
    if (summary.clientContact) {
      lines.push(`📱 Контакт: ${summary.clientContact}`);
    }
    lines.push(`🏠 Интересует: ${summary.interestedIn}`);
    if (summary.budget) {
      lines.push(`💰 Бюджет: ${summary.budget}`);
    }
    if (summary.keyRequirements.length > 0) {
      lines.push(`📋 Пожелания: ${summary.keyRequirements.join(', ')}`);
    }

    // Новое: детали просмотра
    if (summary.viewingDate || summary.viewingTime) {
      lines.push('');
      lines.push('📅 *Просмотр:*');
      if (summary.viewingDate) {
        lines.push(`  Дата: ${summary.viewingDate}`);
      }
      if (summary.viewingTime) {
        lines.push(`  Время: ${summary.viewingTime}`);
      }
      if (summary.viewingLocation) {
        lines.push(`  Локация: ${summary.viewingLocation}`);
      }
    }

    lines.push('');
    lines.push(`📝 ${summary.summaryText}`);
    lines.push('');
    lines.push(`🆔 Диалог: ${summary.conversationId}`);

    return lines.join('\n');
  }
}
