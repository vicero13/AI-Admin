// ============================================================
// Orchestrator - Центральный координатор AI-агента (v2.0)
// Обновлённый pipeline с ConversationDetector, OperatorRequestHandler,
// multi-message responses, deferToViewing
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

import { Logger } from '../utils/logger';
import { ContextManager } from './context-manager';
import { SituationDetector } from './situation-detector';
import { HumanMimicry } from './human-mimicry';
import { HandoffSystem } from './handoff-system';
import { ResourceManager, ResourceMatch } from './resource-manager';
import { AIEngine } from '../ai/engine';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { WorkingHoursService } from './working-hours';
import { GreetingService } from './greeting-service';
import { ContactQualifier, ContactType } from './contact-qualifier';
import { StrangeQuestionHandler, StrangeMessage } from './strange-question-handler';
import { FollowUpService } from './followup-service';
import { SummaryService } from './summary-service';
import { MediaResourceService } from './media-resource-service';
import { ConversationDetector } from './conversation-detector';
import { OperatorRequestHandler } from './operator-request-handler';

export interface OrchestratorConfig {
  aiEngine: AIEngineConfig;
  personality: PersonalityProfile;
  situationDetection: DetectionThresholds;
  handoff: HandoffConfig;
  knowledgeBasePath: string;
  limits: {
    maxMessageLength: number;
    maxConversationDuration: number;
    maxInactiveTime: number;
  };
}

export interface ResourceAttachment {
  type: 'file' | 'link';
  filePath?: string;
  url?: string;
  caption?: string;
}

export interface OrchestratorDeps {
  contextManager: ContextManager;
  situationDetector: SituationDetector;
  humanMimicry: HumanMimicry;
  handoffSystem: HandoffSystem;
  aiEngine: AIEngine;
  knowledgeBase: KnowledgeBase;
  resourceManager?: ResourceManager;
  // Business logic services (all optional for backward compat)
  workingHoursService?: WorkingHoursService;
  greetingService?: GreetingService;
  contactQualifier?: ContactQualifier;
  strangeQuestionHandler?: StrangeQuestionHandler;
  followUpService?: FollowUpService;
  summaryService?: SummaryService;
  mediaResourceService?: MediaResourceService;
  conversationDetector?: ConversationDetector;
  operatorRequestHandler?: OperatorRequestHandler;
}

export interface OrchestratorResponse {
  responseText: string;
  typingDelay: number;
  attachment?: ResourceAttachment;
  // Новое: дополнительные сообщения (для multi-message patterns)
  additionalMessages?: Array<{
    text: string;
    delayMs: number;
  }>;
}

export class Orchestrator {
  private contextManager: ContextManager;
  private situationDetector: SituationDetector;
  private humanMimicry: HumanMimicry;
  private handoffSystem: HandoffSystem;
  private aiEngine: AIEngine;
  private knowledgeBase: KnowledgeBase;
  private resourceManager?: ResourceManager;
  private config: OrchestratorConfig;
  private logger: Logger;
  private running = false;

  // Business logic services
  private workingHoursService?: WorkingHoursService;
  private greetingService?: GreetingService;
  private contactQualifier?: ContactQualifier;
  private strangeQuestionHandler?: StrangeQuestionHandler;
  private followUpService?: FollowUpService;
  private summaryService?: SummaryService;
  private mediaResourceService?: MediaResourceService;
  private conversationDetector?: ConversationDetector;
  private operatorRequestHandler?: OperatorRequestHandler;

  constructor(config: OrchestratorConfig, deps: OrchestratorDeps) {
    this.config = config;
    this.logger = new Logger({ component: 'Orchestrator' });
    this.contextManager = deps.contextManager;
    this.situationDetector = deps.situationDetector;
    this.humanMimicry = deps.humanMimicry;
    this.handoffSystem = deps.handoffSystem;
    this.aiEngine = deps.aiEngine;
    this.knowledgeBase = deps.knowledgeBase;
    this.resourceManager = deps.resourceManager;

    this.workingHoursService = deps.workingHoursService;
    this.greetingService = deps.greetingService;
    this.contactQualifier = deps.contactQualifier;
    this.strangeQuestionHandler = deps.strangeQuestionHandler;
    this.followUpService = deps.followUpService;
    this.summaryService = deps.summaryService;
    this.mediaResourceService = deps.mediaResourceService;
    this.conversationDetector = deps.conversationDetector;
    this.operatorRequestHandler = deps.operatorRequestHandler;
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('Orchestrator started');
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.followUpService) {
      this.followUpService.destroy();
    }
    this.logger.info('Orchestrator stopped');
  }

  /**
   * Главный метод обработки входящего сообщения.
   * Обновлённый pipeline v2.0
   */
  async handleIncomingMessage(
    message: UniversalMessage
  ): Promise<OrchestratorResponse | null> {
    if (!this.running) {
      this.logger.warn('Message received but orchestrator is not running');
      return null;
    }

    const conversationId = message.conversationId;
    const text = message.content.text?.trim();

    if (!text) {
      return null;
    }

    try {
      // 1. Получить или создать контекст
      const context = await this.contextManager.getContext(conversationId);

      if (!context.userId || context.userId === conversationId) {
        await this.contextManager.updateContext(conversationId, {
          userId: message.userId,
          platform: message.platform,
        });
      }

      // ★ 2. Проверить рабочие часы
      if (this.workingHoursService?.isEnabled() && !this.workingHoursService.isWithinWorkingHours()) {
        // oncePerSession: проверить, нужно ли отправлять auto-reply
        if (!this.workingHoursService.shouldSendAutoReply(conversationId)) {
          // Уже отправляли, молчим
          await this.contextManager.addMessage(conversationId, {
            messageId: message.messageId,
            timestamp: message.timestamp,
            role: MessageRole.USER,
            content: text,
            handledBy: MessageHandler.AI,
          });
          return null;
        }

        const offHoursMsg = this.workingHoursService.getOffHoursMessage();
        this.workingHoursService.markAutoReplySent(conversationId);

        await this.contextManager.addMessage(conversationId, {
          messageId: message.messageId,
          timestamp: message.timestamp,
          role: MessageRole.USER,
          content: text,
          handledBy: MessageHandler.AI,
        });
        await this.contextManager.addMessage(conversationId, {
          messageId: `ai-offhours-${Date.now()}`,
          timestamp: Date.now(),
          role: MessageRole.ASSISTANT,
          content: offHoursMsg,
          handledBy: MessageHandler.SYSTEM,
        });
        return {
          responseText: offHoursMsg,
          typingDelay: this.humanMimicry.calculateTypingDelay(offHoursMsg),
        };
      }

      // 3. Проверить режим — если human mode, не отвечаем
      if (context.mode === ConversationMode.HUMAN) {
        this.logger.debug(`Conversation ${conversationId} is in HUMAN mode, skipping`);
        await this.contextManager.addMessage(conversationId, {
          messageId: message.messageId,
          timestamp: message.timestamp,
          role: MessageRole.USER,
          content: text,
          handledBy: MessageHandler.HUMAN,
        });
        return null;
      }

      // 4. Сохранить сообщение пользователя в историю
      await this.contextManager.addMessage(conversationId, {
        messageId: message.messageId,
        timestamp: message.timestamp,
        role: MessageRole.USER,
        content: text,
        handledBy: MessageHandler.AI,
      });

      // ★ 5. Отменить/перепланировать Follow-Up
      if (this.followUpService?.isEnabled()) {
        const updCtx = await this.contextManager.getContext(conversationId);
        this.followUpService.onMessageReceived(conversationId, updCtx);
      }

      // ★ 5.5. Проверка запроса оператора / вопрос "ты бот?"
      if (this.operatorRequestHandler?.isEnabled()) {
        // Сначала проверяем подтверждение перевода (если уже предлагали)
        if (this.operatorRequestHandler.isTransferConfirmation(text, conversationId)) {
          const result = this.operatorRequestHandler.handleOperatorRequest(conversationId);
          if (result.handoff) {
            const handoffReason: HandoffReason = {
              type: HandoffReasonType.MANUAL_REQUEST,
              description: 'Клиент запросил оператора',
              severity: RiskLevel.LOW,
              detectedBy: 'operator_request_handler',
            };
            const updatedCtx = await this.contextManager.getContext(conversationId);
            await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedCtx);
            await this.contextManager.updateContext(conversationId, {
              mode: ConversationMode.HUMAN,
              requiresHandoff: true,
            });
            return this.buildMultiMessageResponse(result.messages);
          }
        }

        // Проверяем вопрос "ты бот?"
        if (this.operatorRequestHandler.isBotQuestion(text)) {
          const result = this.operatorRequestHandler.handleBotQuestion(conversationId);
          if (result.messages.length > 0) {
            return this.buildMultiMessageResponse(result.messages);
          }
        }

        // Проверяем запрос оператора
        if (this.operatorRequestHandler.isOperatorRequest(text)) {
          const result = this.operatorRequestHandler.handleOperatorRequest(conversationId);
          if (result.handoff) {
            const handoffReason: HandoffReason = {
              type: HandoffReasonType.MANUAL_REQUEST,
              description: 'Клиент запросил оператора',
              severity: RiskLevel.LOW,
              detectedBy: 'operator_request_handler',
            };
            const updatedCtx = await this.contextManager.getContext(conversationId);
            await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedCtx);
            await this.contextManager.updateContext(conversationId, {
              mode: ConversationMode.HUMAN,
              requiresHandoff: true,
            });
          }
          return this.buildMultiMessageResponse(result.messages);
        }
      }

      // ★ 6. Определить статус разговора и приветствие
      if (this.greetingService?.isEnabled()) {
        const freshContext = await this.contextManager.getContext(conversationId);
        let greetingType: 'full' | 'short' | 'none' = 'none';

        if (this.conversationDetector?.isEnabled()) {
          const messageId = message.metadata?.custom?.messageId as number | undefined;
          const status = this.conversationDetector.detectStatus(conversationId, freshContext, messageId);
          greetingType = this.conversationDetector.getGreetingType(status);
        } else if (this.greetingService.isNewContact(freshContext)) {
          greetingType = 'full';
        }

        if (greetingType !== 'none') {
          const userName = message.metadata?.custom?.firstName as string | undefined
            || context.clientProfile?.name;
          const greeting = await this.greetingService.generateGreeting(userName, freshContext, greetingType);
          if (greeting) {
            await this.contextManager.addMessage(conversationId, {
              messageId: `ai-greeting-${Date.now()}`,
              timestamp: Date.now(),
              role: MessageRole.ASSISTANT,
              content: greeting,
              handledBy: MessageHandler.AI,
            });
            return {
              responseText: greeting,
              typingDelay: this.humanMimicry.calculateTypingDelay(greeting),
            };
          }
        }
      }

      // ★ 7. Классификация контакта
      const updatedContext = await this.contextManager.getContext(conversationId);
      if (this.contactQualifier?.isEnabled()) {
        const contactType = await this.contactQualifier.classify(
          updatedContext.messageHistory,
          updatedContext
        );
        if (this.contactQualifier.shouldIgnore(contactType)) {
          this.logger.info(`Spam detected from ${conversationId}, ignoring`);
          return null;
        }
      }

      // ★ 8. Проверка странных вопросов
      if (this.strangeQuestionHandler?.isEnabled()) {
        // Сначала проверить deferToViewing
        if (this.strangeQuestionHandler.isDeferToViewing(text)) {
          const result = this.strangeQuestionHandler.handleDeferToViewing();
          return this.buildMultiMessageResponse(result.messages);
        }

        const isStrange = await this.strangeQuestionHandler.isStrangeQuestion(text, updatedContext);
        if (isStrange) {
          const result = this.strangeQuestionHandler.handleStrange(conversationId);
          if (result.action === 'handoff') {
            const handoffReason: HandoffReason = {
              type: HandoffReasonType.OUT_OF_SCOPE,
              description: result.reason || 'Повторные нетематические вопросы',
              severity: RiskLevel.MEDIUM,
              detectedBy: 'strange_question_handler',
            };
            await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedContext);
            await this.contextManager.updateContext(conversationId, {
              mode: ConversationMode.HUMAN,
              requiresHandoff: true,
            });
          }
          return this.buildMultiMessageResponse(result.messages);
        } else {
          this.strangeQuestionHandler.resetCount(conversationId);
        }
      }

      // 9. Анализ ситуации
      const analysis = await this.situationDetector.analyze(message, updatedContext);

      // 10. Проверить необходимость передачи менеджеру
      if (analysis.requiresHandoff && analysis.handoffReason) {
        return await this.handleHandoff(conversationId, analysis, updatedContext);
      }

      // 11. Обновить эмоциональное состояние
      if (analysis.emotionalState) {
        await this.contextManager.updateContext(conversationId, {
          emotionalState: analysis.emotionalState.state,
        });
      }

      // 12. Найти релевантные знания
      const knowledgeResults = await this.knowledgeBase.search(text, 5);
      const relevantItems = knowledgeResults.map((r) => r.item);

      // 12.5. Проверить ресурсы — нужно ли отправить файл/ссылку
      let attachment: ResourceAttachment | undefined;
      if (this.resourceManager) {
        const match = this.resourceManager.findMatchingResource(text);
        if (match) {
          if (match.resource.type === 'file' && match.resource.path && this.resourceManager.isFileAvailable(match.resource.id)) {
            attachment = {
              type: 'file',
              filePath: match.resource.path,
              caption: match.resource.description,
            };
          } else if (match.resource.type === 'link' && match.resource.url) {
            attachment = {
              type: 'link',
              url: match.resource.url,
              caption: match.resource.description,
            };
          }
        }
      }

      // ★ 13. Найти релевантные медиа + автоотправка презентации
      let mediaContext = '';
      if (this.mediaResourceService?.isEnabled()) {
        const media = this.mediaResourceService.findRelevantMedia(text);
        if (media.length > 0) {
          mediaContext = this.mediaResourceService.formatMediaMessage(media);
        }

        const matchedObj = this.mediaResourceService.findObjectByKeywords(text);
        if (matchedObj) {
          const resourceLinks = this.mediaResourceService.formatResourceLinks(matchedObj.objectId);
          if (resourceLinks) {
            mediaContext += (mediaContext ? '\n\n' : '') + resourceLinks;
          }

          // Автоотправка презентации
          const presPath = this.mediaResourceService.shouldSendPresentation(conversationId, matchedObj.objectId);
          if (presPath && !attachment) {
            attachment = {
              type: 'file',
              filePath: presPath,
              caption: `Презентация ${matchedObj.object.name}`,
            };
            this.mediaResourceService.markPresentationSent(conversationId, matchedObj.objectId);
            // Устанавливаем контекст для follow-up
            if (this.followUpService?.isEnabled()) {
              this.followUpService.setFollowUpContext(conversationId, 'presentation_sent');
            }
          }
        }
      }

      // 14. Сгенерировать ответ через AI (с retry + stalling + handoff)
      const additionalInstructions: string[] = [];
      if (mediaContext) {
        additionalInstructions.push(
          `Доступные медиа-ресурсы для этого запроса:\n${mediaContext}\nЕсли клиент спрашивает о фото/видео/3D-туре — включи ссылки в ответ.`
        );
      }

      if (this.contactQualifier?.isEnabled()) {
        const contactType = this.contactQualifier.getCachedType(conversationId);
        if (contactType) {
          const strategy = this.contactQualifier.getHandlingStrategy(contactType);
          if (strategy.additionalInstructions) {
            additionalInstructions.push(strategy.additionalInstructions);
          }
        }
      }

      const retryConfig = this.config.aiEngine.retry;
      const maxAttempts = retryConfig?.maxAttempts ?? 1;

      let aiResponse: HumanLikeResponse | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          aiResponse = await this.aiEngine.generateHumanLikeResponse(
            text,
            updatedContext,
            relevantItems,
            this.config.personality
          );
          lastError = null;
          break; // Success — exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.warn(`AI attempt ${attempt}/${maxAttempts} failed`, {
            error: lastError.message,
            conversationId,
            attempt,
          });

          if (attempt < maxAttempts) {
            // Send stalling message to client and wait before retrying
            const stallingMessages = retryConfig?.stallingMessages ?? [];
            const stallingText = stallingMessages[attempt - 1]
              ?? stallingMessages[0]
              ?? 'Секунду, уточняю информацию...';

            await this.contextManager.addMessage(conversationId, {
              messageId: `ai-stall-retry-${Date.now()}`,
              timestamp: Date.now(),
              role: MessageRole.ASSISTANT,
              content: stallingText,
              handledBy: MessageHandler.AI,
            });

            const delayMs = retryConfig?.delayBetweenRetriesMs ?? 60000;

            // Return stalling message immediately; schedule retry as continuation
            // We use a Promise-based delay to wait before the next attempt
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // All attempts failed — handoff to human
      if (!aiResponse || lastError) {
        const handoffStallingMessages = retryConfig?.stallingMessages ?? [];
        const handoffText = handoffStallingMessages.length > 1
          ? handoffStallingMessages[handoffStallingMessages.length - 1]
          : 'Сейчас подключу коллегу, который больше разбирается в вопросе';

        const handoffReason: HandoffReason = {
          type: HandoffReasonType.TECHNICAL_ISSUE,
          description: `AI не ответил после ${maxAttempts} попыток: ${lastError?.message ?? 'unknown'}`,
          severity: RiskLevel.HIGH,
          detectedBy: 'orchestrator_retry',
        };

        await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedContext);
        await this.contextManager.updateContext(conversationId, {
          mode: ConversationMode.HUMAN,
          requiresHandoff: true,
        });

        await this.contextManager.addMessage(conversationId, {
          messageId: `ai-handoff-retry-${Date.now()}`,
          timestamp: Date.now(),
          role: MessageRole.ASSISTANT,
          content: handoffText,
          handledBy: MessageHandler.AI,
        });

        return {
          responseText: handoffText,
          typingDelay: this.humanMimicry.calculateTypingDelay(handoffText),
        };
      }

      // 15. Проверить ответ — если AI не уверен, передать менеджеру
      if (aiResponse.requiresHandoff && aiResponse.handoffReason) {
        return await this.handleHandoff(conversationId, analysis, updatedContext);
      }

      // 16. Применить Human Mimicry
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

      // 17. Проверить на роботичность
      const roboticScore = this.humanMimicry.checkRoboticness(responseText);
      if (roboticScore.score > 70) {
        this.logger.warn(`Response too robotic (score: ${roboticScore.score}), improving`);
        responseText = await this.humanMimicry.applyPersonality(
          responseText,
          this.config.personality
        );
      }

      // ★ 18. Проверить подтверждение просмотра → SummaryService
      if (this.summaryService?.isEnabled()) {
        const viewingConfirmed = await this.summaryService.detectViewingConfirmation(text, updatedContext);
        if (viewingConfirmed) {
          try {
            const summary = await this.summaryService.generateSummary(updatedContext);
            summary.viewingConfirmed = true;
            await this.summaryService.notifyAdmin(summary);
            this.logger.info(`Viewing confirmed for ${conversationId}, notification sent`);
            // Устанавливаем контекст для follow-up
            if (this.followUpService?.isEnabled()) {
              this.followUpService.setFollowUpContext(conversationId, 'viewing_time');
            }
          } catch (err) {
            this.logger.error('Error creating summary', { error: String(err), conversationId, stack: (err as Error)?.stack });
          }
        }
      }

      // ★ 19. Запланировать Follow-Up
      if (this.followUpService?.isEnabled()) {
        const latestContext = await this.contextManager.getContext(conversationId);
        this.followUpService.scheduleFollowUp(conversationId, latestContext);
      }

      // 20. Рассчитать задержку печати
      const typingDelay = this.humanMimicry.calculateTypingDelay(responseText);

      // 21. Сохранить ответ в историю
      await this.contextManager.addMessage(conversationId, {
        messageId: `ai-${Date.now()}`,
        timestamp: Date.now(),
        role: MessageRole.ASSISTANT,
        content: responseText,
        handledBy: MessageHandler.AI,
        confidence: aiResponse.confidence,
        intent: aiResponse.detectedIntent,
      });

      return { responseText, typingDelay, attachment };
    } catch (error) {
      this.logger.error('Error processing message', { error: String(error), conversationId, stack: (error as Error)?.stack });

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
          responseText: 'Извините, произошла небольшая накладка. Сейчас передам коллеге, подождите немного 🙏',
          typingDelay: 1000,
        };
      } catch {
        return {
          responseText: 'Извините, сейчас небольшие технические неполадки. Попробуйте написать чуть позже!',
          typingDelay: 800,
        };
      }
    }
  }

  /**
   * Построить ответ из массива сообщений (multi-message pattern)
   */
  private buildMultiMessageResponse(messages: Array<{ text: string; delayMs: number }>): OrchestratorResponse {
    if (messages.length === 0) {
      return { responseText: '', typingDelay: 0 };
    }

    const first = messages[0];
    const additional = messages.slice(1);

    return {
      responseText: first.text,
      typingDelay: this.humanMimicry.calculateTypingDelay(first.text),
      additionalMessages: additional.length > 0 ? additional : undefined,
    };
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

    await this.contextManager.updateContext(conversationId, {
      mode: ConversationMode.HUMAN,
      requiresHandoff: true,
    });

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

  async switchToAIMode(conversationId: string): Promise<void> {
    this.handoffSystem.setAIMode(conversationId);
    await this.contextManager.updateContext(conversationId, {
      mode: ConversationMode.AI,
      requiresHandoff: false,
    });
    this.logger.info(`Conversation ${conversationId} switched to AI mode`);
  }

  isHumanMode(conversationId: string): boolean {
    return this.handoffSystem.isHumanMode(conversationId);
  }

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
