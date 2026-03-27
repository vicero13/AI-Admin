// ============================================================
// Handoff System - Система передачи диалога менеджеру
// ============================================================

import { v4 as uuidv4 } from 'uuid';

import {
  Handoff,
  HandoffConfig,
  HandoffResult,
  HandoffPackage,
  HandoffResolution,
  HandoffStats,
  HandoffStatus,
  HandoffPriority,
  HandoffReason,
  HandoffReasonType,
  ConversationContext,
  SituationAnalysis,
  ManagerRecommendation,
  DateRange,
  RiskLevel,
  EmotionalState,
  Timestamp,
} from '../types';

export class HandoffSystem {
  private handoffs: Map<string, Handoff> = new Map();
  private humanModeConversations: Set<string> = new Set();
  private handoffConfig: HandoffConfig;
  private onNotify: (message: string, priority: string) => Promise<void>;

  constructor(
    handoffConfig: HandoffConfig,
    onNotify: (message: string, priority: string) => Promise<void>,
  ) {
    this.handoffConfig = handoffConfig;
    this.onNotify = onNotify;
  }

  // --- Инициация передачи ---

  async initiateHandoff(
    conversationId: string,
    reason: HandoffReason,
    context: ConversationContext,
  ): Promise<HandoffResult> {
    const handoffId = uuidv4();
    const now = Date.now() as Timestamp;
    const priority = this.determinePriority(reason);
    const stallingMessage = this.generateStallingMessage(reason);

    const handoff: Handoff = {
      handoffId,
      conversationId,
      userId: context.userId,
      reason,
      context,
      initiatedAt: now,
      notifiedAt: now,
      status: HandoffStatus.PENDING,
      priority,
      metadata: {},
    };

    this.handoffs.set(handoffId, handoff);
    this.setHumanMode(conversationId);

    const notification = this.formatNotification(handoff);
    await this.onNotify(notification, priority);

    handoff.status = HandoffStatus.NOTIFIED;

    return {
      success: true,
      handoffId,
      stallingMessage,
      estimatedWaitTime: this.handoffConfig.estimatedWaitTime,
      notificationsSent: 1,
      metadata: {
        priority,
        reason: reason.type,
      },
    };
  }

  // --- Управление режимом ---

  setHumanMode(conversationId: string): void {
    this.humanModeConversations.add(conversationId);
  }

  setAIMode(conversationId: string): void {
    this.humanModeConversations.delete(conversationId);
  }

  isHumanMode(conversationId: string): boolean {
    return this.humanModeConversations.has(conversationId);
  }

  // --- Сообщения задержки ---

  generateStallingMessage(reason: HandoffReason): string {
    const reasonMessages: Record<string, string> = {
      [HandoffReasonType.AI_PROBING]: 'Минуточку, уточню информацию',
      [HandoffReasonType.COMPLEX_QUERY]: 'Интересный вопрос! Дай минутку, проверю варианты',
      [HandoffReasonType.EMOTIONAL_ESCALATION]: 'Понимаю, сейчас разберусь в ситуации',
      [HandoffReasonType.LOW_CONFIDENCE]: 'Секундочку, уточню детали',
      [HandoffReasonType.SPECIAL_REQUEST]: 'Момент, уточню возможности',
      [HandoffReasonType.OUT_OF_SCOPE]: 'Хороший вопрос! Дай минутку, узнаю',
      [HandoffReasonType.TECHNICAL_ISSUE]: 'Секунду, проверю техническую информацию',
      [HandoffReasonType.MANUAL_REQUEST]: 'Конечно, сейчас подключу специалиста',
    };

    const specificMessage = reasonMessages[reason.type];
    if (specificMessage) {
      // Check if there are custom stalling messages for this reason type
      const customMessages = this.handoffConfig.customStallingMessages?.[reason.type];
      if (customMessages && customMessages.length > 0) {
        const allMessages = [specificMessage, ...customMessages];
        return allMessages[Math.floor(Math.random() * allMessages.length)];
      }
      return specificMessage;
    }

    // Fallback to general stalling messages from config
    const { stallingMessages } = this.handoffConfig;
    if (stallingMessages.length > 0) {
      return stallingMessages[Math.floor(Math.random() * stallingMessages.length)];
    }

    return 'Секундочку, уточню информацию...';
  }

  // --- Подготовка пакета для менеджера ---

  prepareHandoffPackage(
    conversationId: string,
    context: ConversationContext,
    analysis: SituationAnalysis,
  ): HandoffPackage {
    const handoff = this.findHandoffByConversation(conversationId);
    if (!handoff) {
      throw new Error(`No active handoff found for conversation ${conversationId}`);
    }

    const recommendations = this.generateRecommendations(context, analysis);
    const urgentNotes = this.extractUrgentNotes(context, analysis);
    const suggestedResponses = this.generateSuggestedResponses(context, analysis);

    const clientProfile = context.clientProfile ?? {
      userId: context.userId,
      platform: context.platform,
      firstContact: context.sessionStarted,
      lastContact: context.lastActivity,
      totalConversations: 1,
      totalMessages: context.messageHistory.length,
      type: context.clientType,
      tags: [],
      previousTopics: context.currentTopic ? [context.currentTopic] : [],
      metadata: {},
    };

    return {
      handoff,
      client: clientProfile,
      conversationHistory: context.messageHistory,
      context,
      situationAnalysis: analysis,
      recommendations,
      urgentNotes,
      relevantKnowledge: [],
      suggestedResponses,
      metadata: {
        preparedAt: Date.now(),
        conversationDuration: context.lastActivity - context.sessionStarted,
      },
    };
  }

  // --- Форматирование уведомления ---

  formatNotification(handoff: Handoff): string {
    const urgencyEmoji = this.getUrgencyEmoji(handoff.priority);
    const reasonLabel = this.getReasonLabel(handoff.reason);
    const reasonDetails = this.getReasonDetails(handoff);
    const timestamp = new Date(handoff.initiatedAt).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });

    const lastMessages = handoff.context.messageHistory
      .slice(-5)
      .map((msg) => `  ${msg.role === 'user' ? '👤' : '🤖'} ${msg.content}`)
      .join('\n');

    const parts = [
      `${urgencyEmoji} ХЕНДОФФ: ${reasonLabel}`,
      ``,
    ];

    // Добавляем детали причины, если есть
    if (reasonDetails) {
      parts.push(`📋 ${reasonDetails}`, ``);
    }

    parts.push(
      `Клиент: ${handoff.userId}`,
      `ID: ${handoff.conversationId}`,
      ``,
      `📝 Последние сообщения:`,
      lastMessages,
      ``,
      `🕐 ${timestamp}`,
    );

    return parts.join('\n');
  }

  /**
   * Короткая метка причины для заголовка
   */
  private getReasonLabel(reason: HandoffReason): string {
    const labels: Record<string, string> = {
      [HandoffReasonType.AI_PROBING]: '🤖 Проверка на бота',
      [HandoffReasonType.COMPLEX_QUERY]: '❓ Сложный вопрос',
      [HandoffReasonType.EMOTIONAL_ESCALATION]: '😤 Негатив клиента',
      [HandoffReasonType.LOW_CONFIDENCE]: '📭 Нет данных в базе',
      [HandoffReasonType.SPECIAL_REQUEST]: '🏢 Не клиент',
      [HandoffReasonType.OUT_OF_SCOPE]: '🚫 Вне компетенции',
      [HandoffReasonType.TECHNICAL_ISSUE]: '⚙️ Тех. проблема',
      [HandoffReasonType.MANUAL_REQUEST]: '👋 Запрос менеджера',
      [HandoffReasonType.MEDIA_REQUEST]: '📸 Просьба прислать фото/видео',
    };

    return labels[reason.type] ?? reason.type;
  }

  /**
   * Детальное описание причины с контекстом
   */
  private getReasonDetails(handoff: Handoff): string | null {
    const reason = handoff.reason;
    const context = handoff.context;
    const lastUserMessage = context.messageHistory
      .filter(m => m.role === 'user')
      .slice(-1)[0]?.content;

    switch (reason.type) {
      case HandoffReasonType.SPECIAL_REQUEST:
        // Тип контакта (резидент, поставщик, брокер)
        if (reason.description.includes('RESIDENT')) {
          return '👤 Тип: РЕЗИДЕНТ (текущий арендатор)';
        }
        if (reason.description.includes('SUPPLIER')) {
          return '📦 Тип: ПОСТАВЩИК (предлагает услуги)';
        }
        if (reason.description.includes('BROKER')) {
          return '🤝 Тип: БРОКЕР/АГЕНТ';
        }
        return reason.description;

      case HandoffReasonType.LOW_CONFIDENCE:
        // Вопрос, на который не нашлось ответа
        if (lastUserMessage) {
          return `Вопрос без ответа: "${lastUserMessage.slice(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
        }
        return 'Информации нет в базе знаний';

      case HandoffReasonType.OUT_OF_SCOPE:
        if (lastUserMessage) {
          return `Нетематический вопрос: "${lastUserMessage.slice(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
        }
        return reason.description;

      case HandoffReasonType.EMOTIONAL_ESCALATION:
        return `Клиент недоволен. ${reason.description}`;

      case HandoffReasonType.COMPLEX_QUERY:
        if (lastUserMessage) {
          return `Сложный запрос: "${lastUserMessage.slice(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
        }
        return reason.description;

      case HandoffReasonType.TECHNICAL_ISSUE:
        return `Техническая ошибка: ${reason.description}`;

      default:
        return reason.description !== reason.type ? reason.description : null;
    }
  }

  // --- Принятие и завершение ---

  acceptHandoff(handoffId: string, managerId: string): void {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`);
    }

    handoff.status = HandoffStatus.ACCEPTED;
    handoff.acceptedAt = Date.now() as Timestamp;
    handoff.acceptedBy = managerId;
    handoff.assignedTo = managerId;
  }

  resolveHandoff(handoffId: string, resolution: HandoffResolution): void {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`);
    }

    handoff.status = HandoffStatus.RESOLVED;
    handoff.resolvedAt = Date.now() as Timestamp;
    handoff.resolution = resolution;

    if (resolution.returnToAI) {
      this.setAIMode(handoff.conversationId);
    }
  }

  // --- Получение данных ---

  getHandoff(handoffId: string): Handoff | undefined {
    return this.handoffs.get(handoffId);
  }

  getPendingHandoffs(): Handoff[] {
    const pending: Handoff[] = [];
    for (const handoff of this.handoffs.values()) {
      if (
        handoff.status === HandoffStatus.PENDING ||
        handoff.status === HandoffStatus.NOTIFIED
      ) {
        pending.push(handoff);
      }
    }
    return pending.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        [HandoffPriority.URGENT]: 0,
        [HandoffPriority.HIGH]: 1,
        [HandoffPriority.NORMAL]: 2,
        [HandoffPriority.LOW]: 3,
      };
      const priorityDiff =
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return a.initiatedAt - b.initiatedAt;
    });
  }

  getHandoffStats(period?: DateRange): HandoffStats {
    const now = new Date();
    const effectivePeriod: DateRange = period ?? {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      end: now,
    };

    const startTs = effectivePeriod.start.getTime();
    const endTs = effectivePeriod.end.getTime();

    const filtered: Handoff[] = [];
    for (const handoff of this.handoffs.values()) {
      if (handoff.initiatedAt >= startTs && handoff.initiatedAt <= endTs) {
        filtered.push(handoff);
      }
    }

    const byStatus: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalResolutionTime = 0;
    let resolutionTimeCount = 0;
    let resolvedSuccessfully = 0;
    let returnedToAI = 0;

    for (const handoff of filtered) {
      byStatus[handoff.status] = (byStatus[handoff.status] ?? 0) + 1;
      byReason[handoff.reason.type] = (byReason[handoff.reason.type] ?? 0) + 1;
      byPriority[handoff.priority] = (byPriority[handoff.priority] ?? 0) + 1;

      if (handoff.acceptedAt && handoff.notifiedAt) {
        totalResponseTime += handoff.acceptedAt - handoff.notifiedAt;
        responseTimeCount++;
      }

      if (handoff.resolvedAt && handoff.initiatedAt) {
        totalResolutionTime += handoff.resolvedAt - handoff.initiatedAt;
        resolutionTimeCount++;
      }

      if (handoff.resolution) {
        if (handoff.resolution.status === 'resolved_successfully') {
          resolvedSuccessfully++;
        }
        if (handoff.resolution.returnToAI) {
          returnedToAI++;
        }
      }
    }

    return {
      period: effectivePeriod,
      total: filtered.length,
      byStatus,
      byReason,
      byPriority,
      averageResponseTime:
        responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      averageResolutionTime:
        resolutionTimeCount > 0 ? totalResolutionTime / resolutionTimeCount : 0,
      resolvedSuccessfully,
      returnedToAI,
    };
  }

  // --- Приватные методы ---

  private determinePriority(reason: HandoffReason): HandoffPriority {
    switch (reason.severity) {
      case RiskLevel.CRITICAL:
        return HandoffPriority.URGENT;
      case RiskLevel.HIGH:
        return HandoffPriority.HIGH;
      case RiskLevel.MEDIUM:
        return HandoffPriority.NORMAL;
      case RiskLevel.LOW:
      default:
        return HandoffPriority.LOW;
    }
  }

  private getUrgencyEmoji(priority: HandoffPriority): string {
    switch (priority) {
      case HandoffPriority.URGENT:
        return '🚨';
      case HandoffPriority.HIGH:
        return '⚠️';
      case HandoffPriority.NORMAL:
      case HandoffPriority.LOW:
      default:
        return 'ℹ️';
    }
  }

  private getReasonDescription(reason: HandoffReason): string {
    const descriptions: Record<string, string> = {
      [HandoffReasonType.AI_PROBING]: 'Обнаружена попытка проверки на ИИ',
      [HandoffReasonType.COMPLEX_QUERY]: 'Сложный запрос, требуется менеджер',
      [HandoffReasonType.EMOTIONAL_ESCALATION]: 'Эмоциональная эскалация клиента',
      [HandoffReasonType.LOW_CONFIDENCE]: 'Низкая уверенность в ответе',
      [HandoffReasonType.SPECIAL_REQUEST]: 'Специальный запрос клиента',
      [HandoffReasonType.OUT_OF_SCOPE]: 'Вопрос за пределами компетенции',
      [HandoffReasonType.TECHNICAL_ISSUE]: 'Техническая проблема',
      [HandoffReasonType.MANUAL_REQUEST]: 'Клиент запросил менеджера',
    };

    return descriptions[reason.type] ?? reason.description;
  }

  private findHandoffByConversation(conversationId: string): Handoff | undefined {
    for (const handoff of this.handoffs.values()) {
      if (
        handoff.conversationId === conversationId &&
        handoff.status !== HandoffStatus.RESOLVED &&
        handoff.status !== HandoffStatus.CANCELLED
      ) {
        return handoff;
      }
    }
    return undefined;
  }

  private generateRecommendations(
    context: ConversationContext,
    analysis: SituationAnalysis,
  ): ManagerRecommendation[] {
    const recommendations: ManagerRecommendation[] = [];

    // Tone recommendation based on emotional state
    if (
      context.emotionalState === EmotionalState.ANGRY ||
      context.emotionalState === EmotionalState.FRUSTRATED
    ) {
      recommendations.push({
        type: 'tone',
        description: 'Клиент раздражён. Рекомендуется спокойный, эмпатичный тон.',
        priority: 1,
      });
    }

    // AI probing warning
    if (analysis.aiProbing.detected) {
      recommendations.push({
        type: 'warning',
        description:
          'Обнаружена попытка проверки на ИИ. Общайтесь максимально естественно, используйте личный опыт.',
        priority: 1,
      });
    }

    // Complexity information
    if (analysis.complexity.score > 0.7) {
      recommendations.push({
        type: 'information',
        description: `Сложный запрос (${(analysis.complexity.score * 100).toFixed(0)}%). Недостающая информация: ${analysis.complexity.missingInformation.join(', ') || 'нет'}`,
        priority: 2,
      });
    }

    // Action recommendation based on urgency
    if (analysis.urgency === 'urgent' || analysis.urgency === 'high') {
      recommendations.push({
        type: 'action',
        description: 'Высокая срочность. Рекомендуется ответить как можно скорее.',
        priority: 1,
      });
    }

    // VIP client
    if (context.clientType === 'vip') {
      recommendations.push({
        type: 'warning',
        description: 'VIP-клиент. Обратите особое внимание на качество обслуживания.',
        priority: 1,
      });
    }

    // Topic context
    if (context.currentTopic) {
      recommendations.push({
        type: 'information',
        description: `Текущая тема разговора: ${context.currentTopic}`,
        priority: 3,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private extractUrgentNotes(
    context: ConversationContext,
    analysis: SituationAnalysis,
  ): string[] {
    const notes: string[] = [];

    if (analysis.overallRisk === RiskLevel.CRITICAL) {
      notes.push('КРИТИЧЕСКИЙ УРОВЕНЬ РИСКА - требуется немедленное внимание');
    }

    if (analysis.aiProbing.detected && analysis.aiProbing.confidence > 0.8) {
      notes.push('Высокая вероятность проверки на ИИ - будьте осторожны с формулировками');
    }

    if (
      analysis.emotionalState.state === EmotionalState.ANGRY &&
      analysis.emotionalState.changeFromPrevious === 'escalated'
    ) {
      notes.push('Клиент всё более раздражён - ситуация ухудшается');
    }

    if (context.suspectAI) {
      notes.push('Клиент ранее подозревался в тестировании на ИИ');
    }

    return notes;
  }

  updateConfig(config: HandoffConfig): void {
    this.handoffConfig = config;
  }

  private generateSuggestedResponses(
    context: ConversationContext,
    analysis: SituationAnalysis,
  ): string[] {
    const suggestions: string[] = [];

    if (analysis.handoffReason?.type === HandoffReasonType.MANUAL_REQUEST) {
      suggestions.push(
        'Здравствуйте! Я менеджер, чем могу помочь?',
      );
    }

    if (analysis.handoffReason?.type === HandoffReasonType.EMOTIONAL_ESCALATION) {
      suggestions.push(
        'Понимаю вашу ситуацию, давайте разберёмся вместе. Расскажите подробнее, что произошло.',
      );
    }

    if (analysis.handoffReason?.type === HandoffReasonType.AI_PROBING) {
      suggestions.push(
        'Привет! Да, я тут, слушаю) Чем могу помочь?',
      );
    }

    return suggestions;
  }
}
