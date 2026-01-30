// ============================================================
// Orchestrator - Центральный координатор AI-агента
// ============================================================

import {
  UniversalMessage,
  ConversationContext,
  ConversationMode,
  HandoffReason,
  HandoffReasonType,
  HumanLikeResponse,
  SituationAnalysis,
  KnowledgeItem,
  PlatformType,
  MessageRole,
  MessageHandler,
  MessageType,
  RiskLevel,
  UrgencyLevel,
  EmotionalState,
  PersonalityProfile,
  DetectionThresholds,
  HandoffConfig,
  AIEngineConfig,
  LogLevel,
  UUID,
  Timestamp,
} from '../types';

import { ContextManager } from './context-manager';
import { SituationDetector } from './situation-detector';
import { HumanMimicry } from './human-mimicry';
import { HandoffSystem } from './handoff-system';
import { AIEngine } from '../ai/engine';
import { KnowledgeBase } from '../knowledge/knowledge-base';

export interface OrchestratorConfig {
  aiEngine: AIEngineConfig;
  personality: PersonalityProfile;
  situationDetection: DetectionThresholds;
  handoff: HandoffConfig;
  knowledgeBasePath: string;
  limits: {
    maxMessageLength: number;
    maxConversationDuration: number; // seconds
    maxInactiveTime: number; // seconds
  };
}

export interface OrchestratorDeps {
  contextManager: ContextManager;
  situationDetector: SituationDetector;
  humanMimicry: HumanMimicry;
  handoffSystem: HandoffSystem;
  aiEngine: AIEngine;
  knowledgeBase: KnowledgeBase;
}

export class Orchestrator {
  private contextManager: ContextManager;
  private situationDetector: SituationDetector;
  private humanMimicry: HumanMimicry;
  private handoffSystem: HandoffSystem;
  private aiEngine: AIEngine;
  private knowledgeBase: KnowledgeBase;
  private config: OrchestratorConfig;
  private running = false;

  constructor(config: OrchestratorConfig, deps: OrchestratorDeps) {
    this.config = config;
    this.contextManager = deps.contextManager;
    this.situationDetector = deps.situationDetector;
    this.humanMimicry = deps.humanMimicry;
    this.handoffSystem = deps.handoffSystem;
    this.aiEngine = deps.aiEngine;
    this.knowledgeBase = deps.knowledgeBase;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('[Orchestrator] Запущен');
  }

  async stop(): Promise<void> {
    this.running = false;
    console.log('[Orchestrator] Остановлен');
  }

  /**
   * Главный метод обработки входящего сообщения.
   * Возвращает текст ответа и задержку для имитации печати.
   */
  async handleIncomingMessage(
    message: UniversalMessage
  ): Promise<{ responseText: string; typingDelay: number } | null> {
    if (!this.running) {
      console.warn('[Orchestrator] Получено сообщение, но оркестратор не запущен');
      return null;
    }

    const conversationId = message.conversationId;
    const text = message.content.text?.trim();

    if (!text) {
      // Пока обрабатываем только текстовые сообщения
      return null;
    }

    try {
      // 1. Получить или создать контекст
      const context = await this.contextManager.getContext(conversationId);

      // Обновить userId и platform если нужно
      if (!context.userId || context.userId === conversationId) {
        await this.contextManager.updateContext(conversationId, {
          userId: message.userId,
          platform: message.platform,
        });
      }

      // 2. Проверить режим — если human mode, не отвечаем
      if (context.mode === ConversationMode.HUMAN) {
        console.log(`[Orchestrator] Диалог ${conversationId} в режиме HUMAN, пропускаем`);
        // Сохраняем сообщение в историю
        await this.contextManager.addMessage(conversationId, {
          messageId: message.messageId,
          timestamp: message.timestamp,
          role: MessageRole.USER,
          content: text,
          handledBy: MessageHandler.HUMAN,
        });
        return null;
      }

      // 3. Сохранить сообщение пользователя в историю
      await this.contextManager.addMessage(conversationId, {
        messageId: message.messageId,
        timestamp: message.timestamp,
        role: MessageRole.USER,
        content: text,
        handledBy: MessageHandler.AI,
      });

      // 4. Анализ ситуации
      const updatedContext = await this.contextManager.getContext(conversationId);
      const analysis = await this.situationDetector.analyze(message, updatedContext);

      // 5. Проверить необходимость передачи менеджеру
      if (analysis.requiresHandoff && analysis.handoffReason) {
        return await this.handleHandoff(conversationId, analysis, updatedContext);
      }

      // 6. Обновить эмоциональное состояние
      if (analysis.emotionalState) {
        await this.contextManager.updateContext(conversationId, {
          emotionalState: analysis.emotionalState.state,
        });
      }

      // 7. Найти релевантные знания
      const knowledgeResults = await this.knowledgeBase.search(text, 5);
      const relevantItems = knowledgeResults.map((r) => r.item);

      // 8. Сгенерировать ответ через AI
      const aiResponse = await this.aiEngine.generateHumanLikeResponse(
        text,
        updatedContext,
        relevantItems,
        this.config.personality
      );

      // 9. Проверить ответ — если AI не уверен, передать менеджеру
      if (aiResponse.requiresHandoff && aiResponse.handoffReason) {
        return await this.handleHandoff(
          conversationId,
          analysis,
          updatedContext
        );
      }

      // 10. Применить Human Mimicry
      let responseText = aiResponse.text;
      responseText = await this.humanMimicry.makeNatural(responseText, {
        allowTypo: false,
        useColloquialisms: true,
        varyStructure: true,
        useContractions: false,
      });
      responseText = await this.humanMimicry.addHumanTouch(responseText, {
        addThinkingPause: false,
        addEmoji: this.config.personality.traits.emojiUsage !== 'none',
        addColloquialism: false,
        addPersonalTouch: false,
      });

      // 11. Проверить на роботичность
      const roboticScore = this.humanMimicry.checkRoboticness(responseText);
      if (roboticScore.score > 70) {
        console.warn(
          `[Orchestrator] Ответ слишком роботичный (score: ${roboticScore.score}), пробуем улучшить`
        );
        responseText = await this.humanMimicry.applyPersonality(
          responseText,
          this.config.personality
        );
      }

      // 12. Рассчитать задержку печати
      const typingDelay = this.humanMimicry.calculateTypingDelay(responseText);

      // 13. Сохранить ответ в историю
      await this.contextManager.addMessage(conversationId, {
        messageId: `ai-${Date.now()}`,
        timestamp: Date.now(),
        role: MessageRole.ASSISTANT,
        content: responseText,
        handledBy: MessageHandler.AI,
        confidence: aiResponse.confidence,
        intent: aiResponse.detectedIntent,
      });

      return { responseText, typingDelay };
    } catch (error) {
      console.error('[Orchestrator] Ошибка обработки сообщения:', error);

      // Фоллбэк — передать менеджеру при ошибке
      const fallbackReason: HandoffReason = {
        type: HandoffReasonType.TECHNICAL_ISSUE,
        description: 'Техническая ошибка при обработке сообщения',
        severity: RiskLevel.HIGH,
        detectedBy: 'orchestrator',
      };

      try {
        const context = await this.contextManager.getContext(conversationId);
        const result = await this.handoffSystem.initiateHandoff(
          conversationId,
          fallbackReason,
          context
        );
        return {
          responseText: 'Извини, произошла небольшая накладка. Сейчас передам коллеге, подожди немного 🙏',
          typingDelay: 1000,
        };
      } catch {
        return {
          responseText: 'Извини, сейчас небольшие технические неполадки. Попробуй написать чуть позже!',
          typingDelay: 800,
        };
      }
    }
  }

  /**
   * Обработка передачи менеджеру
   */
  private async handleHandoff(
    conversationId: string,
    analysis: SituationAnalysis,
    context: ConversationContext
  ): Promise<{ responseText: string; typingDelay: number }> {
    const reason = analysis.handoffReason || {
      type: HandoffReasonType.LOW_CONFIDENCE,
      description: 'AI не уверен в ответе',
      severity: RiskLevel.MEDIUM,
      detectedBy: 'orchestrator',
    };

    const handoffResult = await this.handoffSystem.initiateHandoff(
      conversationId,
      reason,
      context
    );

    // Обновить контекст
    await this.contextManager.updateContext(conversationId, {
      mode: ConversationMode.HUMAN,
      requiresHandoff: true,
    });

    // Сохранить stalling message в историю
    await this.contextManager.addMessage(conversationId, {
      messageId: `ai-stall-${Date.now()}`,
      timestamp: Date.now(),
      role: MessageRole.ASSISTANT,
      content: handoffResult.stallingMessage,
      handledBy: MessageHandler.AI,
    });

    const typingDelay = this.humanMimicry.calculateTypingDelay(
      handoffResult.stallingMessage
    );

    return {
      responseText: handoffResult.stallingMessage,
      typingDelay,
    };
  }

  /**
   * Переключить диалог обратно в AI mode
   */
  async switchToAIMode(conversationId: string): Promise<void> {
    this.handoffSystem.setAIMode(conversationId);
    await this.contextManager.updateContext(conversationId, {
      mode: ConversationMode.AI,
      requiresHandoff: false,
    });
    console.log(`[Orchestrator] Диалог ${conversationId} переключён в AI mode`);
  }

  /**
   * Проверить, находится ли диалог в режиме human
   */
  isHumanMode(conversationId: string): boolean {
    return this.handoffSystem.isHumanMode(conversationId);
  }

  /**
   * Получить метрики системы
   */
  getMetrics(): {
    running: boolean;
    knowledgeBaseLoaded: boolean;
  } {
    return {
      running: this.running,
      knowledgeBaseLoaded: true,
    };
  }
}
