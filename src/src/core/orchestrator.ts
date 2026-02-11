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

  // Блокировка для последовательной обработки сообщений от одного пользователя
  private processingLocks: Map<string, Promise<OrchestratorResponse | null>> = new Map();

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
   *
   * ВАЖНО: Используется блокировка для последовательной обработки
   * сообщений от одного пользователя, чтобы избежать race conditions
   * (например, дублирования приветствий)
   */
  async handleIncomingMessage(
    message: UniversalMessage
  ): Promise<OrchestratorResponse | null> {
    if (!this.running) {
      this.logger.warn('Message received but orchestrator is not running');
      return null;
    }

    const conversationId = message.conversationId;

    // Ждём завершения предыдущей обработки для этого пользователя
    const existingLock = this.processingLocks.get(conversationId);
    if (existingLock) {
      this.logger.debug(`Waiting for previous message processing for ${conversationId}`);
      await existingLock.catch(() => {}); // Игнорируем ошибки предыдущей обработки
    }

    // Создаём новый промис для текущей обработки
    const processingPromise = this.processMessageInternal(message);
    this.processingLocks.set(conversationId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      // Очищаем блокировку после завершения
      if (this.processingLocks.get(conversationId) === processingPromise) {
        this.processingLocks.delete(conversationId);
      }
    }
  }

  /**
   * Внутренний метод обработки сообщения (без блокировки)
   */
  private async processMessageInternal(
    message: UniversalMessage
  ): Promise<OrchestratorResponse | null> {
    const conversationId = message.conversationId;
    const text = message.content.text?.trim();

    if (!text) {
      return null;
    }

    // Если приветствие уже отправлено, но сообщение содержало запрос — здесь храним текст приветствия
    let pendingGreeting: string | null = null;

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
        this.logger.info(`[Step 3] HUMAN mode for ${conversationId}, skipping message: "${text.substring(0, 50)}"`);
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

          // При обнаружении нового разговора (очистка чата / долгий перерыв) — сбросить историю
          if (status === 'new_conversation' || status === 'new_contact') {
            if (freshContext.messageHistory && freshContext.messageHistory.length > 0) {
              // Очищаем историю сообщений, но сохраняем контекст (userId, platform и т.д.)
              this.contextManager.updateContext(conversationId, {
                messageHistory: [],
                mode: ConversationMode.AI,
                requiresHandoff: false,
                suspectAI: false,
                complexQuery: false,
              });
              this.conversationDetector.resetConversation(conversationId);
              this.logger.info(`[Orchestrator] Context reset for ${conversationId} — status: ${status}`);
            }
          }
        } else if (this.greetingService.isNewContact(freshContext)) {
          greetingType = 'full';
        }

        if (greetingType !== 'none') {
          const userName = message.metadata?.custom?.firstName as string | undefined
            || context.clientProfile?.name;
          const greeting = await this.greetingService.generateGreeting(userName, freshContext, greetingType);
          if (greeting) {
            // Проверяем, содержит ли сообщение запрос помимо приветствия
            const textWithoutGreeting = this.stripGreetingFromText(text);
            if (textWithoutGreeting.length < 5) {
              // Чистое приветствие — помечаем как отправленное и возвращаем
              if (this.conversationDetector) {
                this.conversationDetector.markGreetingSent(conversationId);
              }
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

            // Сообщение содержит и приветствие, и запрос — сохраняем greeting как pending.
            // markGreetingSent вызовется позже, когда greeting реально будет отправлен.
            this.logger.info(`[Step 6] Greeting + request detected: "${textWithoutGreeting.substring(0, 50)}"`);
            pendingGreeting = greeting;
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

        // Auto-handoff for residents, suppliers, etc.
        const strategy = this.contactQualifier.getHandlingStrategy(contactType);
        if (strategy.handoffToManager) {
          this.logger.info(`Contact type ${contactType} requires handoff for ${conversationId}`);

          // Generate a brief polite response before handoff
          const handoffReason: HandoffReason = {
            type: HandoffReasonType.SPECIAL_REQUEST,
            description: contactType, // Передаём тип контакта для метки в уведомлении
            severity: RiskLevel.LOW,
            detectedBy: 'contact_qualifier',
          };

          await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedContext);
          await this.contextManager.updateContext(conversationId, {
            mode: ConversationMode.HUMAN,
            requiresHandoff: true,
          });

          // Use AI to generate a natural brief response acknowledging their request
          // before handing off, with the additionalInstructions from strategy
          try {
            const knowledgeResults = await this.knowledgeBase.search(text, 3);
            const relevantItems = knowledgeResults.map((r) => r.item);
            const aiResponse = await this.aiEngine.generateHumanLikeResponse(
              text,
              updatedContext,
              relevantItems,
              this.config.personality
            );

            const responseText = await this.humanMimicry.makeNatural(aiResponse.text, {
              allowTypo: false,
              useColloquialisms: true,
              varyStructure: true,
              useContractions: false,
            });

            await this.contextManager.addMessage(conversationId, {
              messageId: `ai-handoff-qualify-${Date.now()}`,
              timestamp: Date.now(),
              role: MessageRole.ASSISTANT,
              content: responseText,
              handledBy: MessageHandler.AI,
            });

            return {
              responseText,
              typingDelay: this.humanMimicry.calculateTypingDelay(responseText),
            };
          } catch {
            // Fallback: simple handoff message
            const fallbackMsg = 'Добрый день! Сейчас переключу на коллегу, который сможет помочь 🙏';
            await this.contextManager.addMessage(conversationId, {
              messageId: `ai-handoff-qualify-${Date.now()}`,
              timestamp: Date.now(),
              role: MessageRole.ASSISTANT,
              content: fallbackMsg,
              handledBy: MessageHandler.AI,
            });
            return {
              responseText: fallbackMsg,
              typingDelay: this.humanMimicry.calculateTypingDelay(fallbackMsg),
            };
          }
        }
      }

      // ★ 7.5. Проверка на мат/оскорбления — немедленный хэндофф
      const profanityCheck = this.situationDetector.detectProfanity(text);
      if (profanityCheck.detected) {
        this.logger.info(`[Step 7.5] PROFANITY detected: ${profanityCheck.words.join(', ')}`);

        // Отправить скрипт "Что?" / "Могу ли чем-то помочь" через strangeQuestionHandler
        const scriptMessages: { text: string; delayMs: number }[] = [];

        // Если есть pending greeting — добавляем его первым
        if (pendingGreeting) {
          scriptMessages.push({ text: pendingGreeting, delayMs: 0 });
          if (this.conversationDetector) {
            this.conversationDetector.markGreetingSent(conversationId);
          }
        }

        if (this.strangeQuestionHandler?.isEnabled()) {
          const result = this.strangeQuestionHandler.handleStrange(conversationId);
          scriptMessages.push(...result.messages);
        } else {
          scriptMessages.push({ text: 'Что?', delayMs: 0 });
          scriptMessages.push({ text: 'Могу ли чем-то помочь, что касается наших офисов?)', delayMs: 5000 });
        }

        // Инициировать хэндофф
        const handoffReason: HandoffReason = {
          type: HandoffReasonType.PROFANITY,
          description: `⚠️ Обнаружен мат/оскорбления: ${profanityCheck.words.join(', ')}`,
          severity: RiskLevel.HIGH,
          detectedBy: 'profanity_detector',
        };
        await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedContext);
        await this.contextManager.updateContext(conversationId, {
          mode: ConversationMode.HUMAN,
          requiresHandoff: true,
        });

        return this.buildMultiMessageResponse(scriptMessages);
      }

      // ★ 8. Проверка странных вопросов
      if (this.strangeQuestionHandler?.isEnabled()) {
        // Сначала проверить deferToViewing
        if (this.strangeQuestionHandler.isDeferToViewing(text)) {
          const result = this.strangeQuestionHandler.handleDeferToViewing();
          const allMessages: { text: string; delayMs: number }[] = [];
          if (pendingGreeting) {
            allMessages.push({ text: pendingGreeting, delayMs: 0 });
            if (this.conversationDetector) {
              this.conversationDetector.markGreetingSent(conversationId);
            }
          }
          allMessages.push(...result.messages);
          return this.buildMultiMessageResponse(allMessages);
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

          // Если есть pending greeting — добавляем его перед скриптом
          const allMessages: { text: string; delayMs: number }[] = [];
          if (pendingGreeting) {
            allMessages.push({ text: pendingGreeting, delayMs: 0 });
            if (this.conversationDetector) {
              this.conversationDetector.markGreetingSent(conversationId);
            }
          }
          allMessages.push(...result.messages);

          return this.buildMultiMessageResponse(allMessages);
        } else {
          this.strangeQuestionHandler.resetCount(conversationId);
        }
      }

      // 9. Анализ ситуации
      const analysis = await this.situationDetector.analyze(message, updatedContext);
      this.logger.info(`[Step 9] Analysis for "${text.substring(0, 50)}": confidence=${analysis.confidence.score}, complexity=${analysis.complexity.score}, aiProbing=${analysis.aiProbing.detected}, emotion=${analysis.emotionalState.state}, requiresHandoff=${analysis.requiresHandoff}`);

      // 10. Проверить необходимость передачи менеджеру
      if (analysis.requiresHandoff && analysis.handoffReason) {
        this.logger.info(`[Step 10] HANDOFF for "${text.substring(0, 50)}": reason=${analysis.handoffReason.type}, description=${analysis.handoffReason.description}`);
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

      // 12.1. ВСЕГДА включаем ВСЕ офисы в контекст (чтобы AI не галлюцинировал)
      const allOfficeItems = this.knowledgeBase.getOfficeKnowledgeItems();
      const existingIds = new Set(relevantItems.map((i) => i.id));
      for (const officeItem of allOfficeItems) {
        if (!existingIds.has(officeItem.id)) {
          relevantItems.push(officeItem);
        }
      }

      // Логируем что нашли в базе знаний
      this.logger.info(`[Step 12] Knowledge search for "${text.substring(0, 50)}":`);
      if (knowledgeResults.length === 0) {
        this.logger.info(`  → Ничего не найдено в базе знаний`);
      } else {
        for (const result of knowledgeResults) {
          const content = result.item.content as Record<string, unknown>;
          const metadata = content?.metadata as Record<string, unknown> | undefined;
          const price = (content?.pricing as Array<Record<string, unknown>>)?.[0]?.amount;
          const seats = metadata?.seats;
          this.logger.info(
            `  → [${result.item.type}] "${result.item.title}" (relevance: ${result.relevance.toFixed(2)})` +
            (seats ? ` | Мест: ${seats}` : '') +
            (price ? ` | Цена: ${price}₽` : '')
          );
        }
      }

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

      // Защита от повторного приветствия: ПЕРЕЗАГРУЖАЕМ контекст для актуальной истории
      const freshContextForGreeting = await this.contextManager.getContext(conversationId);
      const hasGreeting = freshContextForGreeting.messageHistory.some(
        (m) => m.role === MessageRole.ASSISTANT &&
          (m.content.includes('Добрый день') ||
           m.content.includes('Здравствуйте') ||
           m.content.includes('приятно познакомиться') ||
           m.content.includes('Привет'))
      );
      if (hasGreeting) {
        additionalInstructions.push(
          '⚠️ КРИТИЧЕСКИ ВАЖНО: Приветствие УЖЕ было отправлено в этом разговоре! ' +
          'КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО здороваться повторно! ' +
          'НЕ пиши "Привет", "Добрый день", "Здравствуйте", "Приветствую". ' +
          'Начинай СРАЗУ с ответа на вопрос клиента.'
        );
      }

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

      this.logger.info(`[Step 14] Generating AI response for "${text.substring(0, 50)}", maxAttempts=${maxAttempts}`);

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
          this.logger.info(`[Step 14] AI response OK: confidence=${aiResponse.confidence}, handoff=${aiResponse.requiresHandoff}`);
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
              ?? 'Секунду, уточняю информацию';

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
        this.logger.error(`[Step 14] AI FAILED for "${text.substring(0, 50)}": ${lastError?.message ?? 'no response'}`);

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
        this.logger.info(`[Step 15] AI requested handoff: ${aiResponse.handoffReason.type} — ${aiResponse.handoffReason.description}`);
        return await this.handleHandoff(conversationId, analysis, updatedContext);
      }

      // 15.5. Проверить текст AI на фразы handoff — если AI обещает переключить,
      // но requiresHandoff === false, принудительно вызываем handoff
      const handoffPhrases = [
        'переключу на менеджера',
        'переключу на коллег',
        'переключу на коллегу',
        'переведу на менеджера',
        'передам коллег',
        'передам менеджер',
        'подключу коллег',
        'подключу менеджер',
        'свяжу с менеджером',
        'свяжу с коллег',
        'уточню у коллег',
        'спрошу у коллег',
      ];
      const responseTextLower = aiResponse.text.toLowerCase();
      const detectedHandoffPhrase = handoffPhrases.find(phrase => responseTextLower.includes(phrase));
      if (detectedHandoffPhrase) {
        this.logger.info(`[Step 15.5] AI text contains handoff phrase: "${detectedHandoffPhrase}" — triggering handoff`);

        const handoffReason: HandoffReason = {
          type: HandoffReasonType.LOW_CONFIDENCE,
          description: `AI сам предложил переключить на менеджера: "${detectedHandoffPhrase}"`,
          severity: RiskLevel.MEDIUM,
          detectedBy: 'orchestrator_text_detection',
        };

        await this.handoffSystem.initiateHandoff(conversationId, handoffReason, updatedContext);
        await this.contextManager.updateContext(conversationId, {
          mode: ConversationMode.HUMAN,
          requiresHandoff: true,
        });

        // Отправляем текст AI как есть (он уже содержит фразу про менеджера)
        const responseText = this.sanitizeResponse(aiResponse.text);
        await this.contextManager.addMessage(conversationId, {
          messageId: `ai-handoff-text-${Date.now()}`,
          timestamp: Date.now(),
          role: MessageRole.ASSISTANT,
          content: responseText,
          handledBy: MessageHandler.AI,
        });

        // Если было приветствие + запрос → приветствие + ответ AI как additional
        if (pendingGreeting) {
          if (this.conversationDetector) {
            this.conversationDetector.markGreetingSent(conversationId);
          }
          await this.contextManager.addMessage(conversationId, {
            messageId: `ai-greeting-${Date.now()}`,
            timestamp: Date.now(),
            role: MessageRole.ASSISTANT,
            content: pendingGreeting,
            handledBy: MessageHandler.AI,
          });
          return {
            responseText: pendingGreeting,
            typingDelay: this.humanMimicry.calculateTypingDelay(pendingGreeting),
            additionalMessages: [{
              text: responseText,
              delayMs: 1500 + Math.random() * 2000,
            }],
          };
        }

        return {
          responseText,
          typingDelay: this.humanMimicry.calculateTypingDelay(responseText),
        };
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

      // 16.5. Удалить запрещённые фразы и символы (пост-обработка)
      responseText = this.sanitizeResponse(responseText);

      // 16.6. Удалить повторное приветствие если уже здоровались
      if (hasGreeting) {
        responseText = this.removeGreetingFromResponse(responseText);
      }

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

      // Если было приветствие + запрос — вернём greeting как основное, AI-ответ как additional
      if (pendingGreeting) {
        if (this.conversationDetector) {
          this.conversationDetector.markGreetingSent(conversationId);
        }
        await this.contextManager.addMessage(conversationId, {
          messageId: `ai-greeting-${Date.now()}`,
          timestamp: Date.now(),
          role: MessageRole.ASSISTANT,
          content: pendingGreeting,
          handledBy: MessageHandler.AI,
        });
        return {
          responseText: pendingGreeting,
          typingDelay: this.humanMimicry.calculateTypingDelay(pendingGreeting),
          attachment,
          additionalMessages: [{
            text: responseText,
            delayMs: 1500 + Math.random() * 2000,
          }],
        };
      }

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

  /**
   * Удалить приветствие из ответа (если уже здоровались ранее)
   */
  private removeGreetingFromResponse(text: string): string {
    let result = text;

    // Паттерны приветствий в начале сообщения (включая с именем клиента)
    const greetingPatterns = [
      // С именем: "Привет, Виктория!", "Здравствуйте, Виктория!"
      /^Привет,?\s+[А-ЯЁа-яё]+[!]?\s*[—\-]?\s*😊?\s*/i,
      /^Здравствуйте,?\s+[А-ЯЁа-яё]+[!]?\s*/i,
      /^Добрый день,?\s+[А-ЯЁа-яё]+[!]?\s*/i,
      /^Добрый вечер,?\s+[А-ЯЁа-яё]+[!]?\s*/i,
      /^Доброе утро,?\s+[А-ЯЁа-яё]+[!]?\s*/i,
      /^Приветствую,?\s+[А-ЯЁа-яё]+[!]?\s*/i,
      // Без имени
      /^Привет!?\s*[—\-]?\s*😊?\s*/i,
      /^Привет,?\s*/i,
      /^Здравствуйте!?\s*/i,
      /^Добрый день!?\s*/i,
      /^Добрый вечер!?\s*/i,
      /^Доброе утро!?\s*/i,
      /^Приветствую!?\s*/i,
      /^Рад[аы]? приветствовать!?\s*/i,
      // Оставшаяся запятая с именем: ", Виктория!" (если основное приветствие уже удалено)
      /^,?\s*[А-ЯЁа-яё]+[!]?\s*😊?\s*/,
    ];

    for (const pattern of greetingPatterns) {
      result = result.replace(pattern, '');
    }

    // Убедиться что первая буква заглавная
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result.trim();
  }

  /**
   * Убрать приветствие из пользовательского сообщения, чтобы определить,
   * содержит ли оно запрос помимо приветствия.
   * Возвращает текст без приветственных слов.
   */
  /**
   * Конвертация текста из английской раскладки в русскую.
   */
  private convertEnToRu(text: string): string {
    const enToRu: Record<string, string> = {
      'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г',
      'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ', 'a': 'ф', 's': 'ы',
      'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д',
      ';': 'ж', "'": 'э', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и',
      'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю', '/': '.',
    };
    return text.toLowerCase().split('').map(c => enToRu[c] || c).join('');
  }

  /**
   * Проверка, является ли текст приветствием (включая английскую раскладку)
   */
  private isGreetingOnly(text: string): boolean {
    const greetingWords = [
      'привет', 'приветствую', 'здравствуйте', 'здрасте',
      'добрый день', 'добрый вечер', 'доброе утро',
      'хай', 'салют', 'hello', 'hi',
    ];
    const lower = text.toLowerCase().replace(/[!.,?\s]+/g, ' ').trim();
    const converted = this.convertEnToRu(lower);
    return greetingWords.some(g => lower === g || converted === g);
  }

  private stripGreetingFromText(text: string): string {
    // Сначала проверяем, не является ли весь текст приветствием в неправильной раскладке
    if (this.isGreetingOnly(text)) {
      return '';
    }

    let result = text;

    const greetingPatterns = [
      /^добрый\s+день[!.,]?\s*/i,
      /^добрый\s+вечер[!.,]?\s*/i,
      /^доброе\s+утро[!.,]?\s*/i,
      /^здравствуйте[!.,]?\s*/i,
      /^привет[!.,]?\s*/i,
      /^приветствую[!.,]?\s*/i,
      /^хай[!.,]?\s*/i,
      /^hello[!.,]?\s*/i,
      /^hi[!.,]?\s*/i,
    ];

    for (const pattern of greetingPatterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  /**
   * Удалить запрещённые фразы и символы из ответа
   */
  private sanitizeResponse(text: string): string {
    let result = text;

    // Запрещённые фразы (удаляем вместе с пунктуацией после них)
    const forbiddenPhrases = [
      /К слову,?\s*/gi,
      /Кстати говоря,?\s*/gi,
      /Кстати,?\s*/gi,
      /Между прочим,?\s*/gi,
      /Короче,?\s*/gi,
      /Так вот,?\s*/gi,
      /В общем,?\s*/gi,
      /На самом деле,?\s*/gi,
      /По факту,?\s*/gi,
      /Собственно,?\s*/gi,
    ];

    for (const pattern of forbiddenPhrases) {
      result = result.replace(pattern, '');
    }

    // Слова-паразиты — удаляем везде где встречаются
    const fillerPatterns = [
      // В начале сообщения
      /^Слушайте,?\s*/i,
      /^Слушай,?\s*/i,
      /^Смотрите,?\s*/i,
      /^Смотри,?\s*/i,
      /^Знаете,?\s*/i,
      /^Понимаете,?\s*/i,
      /^Ну,?\s*/i,
      /^Вот,?\s*/i,
      /^По сути,?\s*/i,
      // После точки/восклицательного знака
      /([.!?])\s+Слушайте,?\s*/gi,
      /([.!?])\s+Слушай,?\s*/gi,
      /([.!?])\s+Смотрите,?\s*/gi,
      /([.!?])\s+Смотри,?\s*/gi,
      /([.!?])\s+Знаете,?\s*/gi,
      /([.!?])\s+По сути,?\s*/gi,
      /([.!?])\s+Ну,?\s*/gi,
    ];

    for (const pattern of fillerPatterns) {
      result = result.replace(pattern, (match, punct) => {
        // Если есть пунктуация — сохраняем её
        if (punct) {
          return punct + ' ';
        }
        return '';
      });
    }

    // Убрать markdown форматирование ** и *
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/\*([^*]+)\*/g, '$1');

    // Запрещённые символы (заменяем на пустоту или альтернативу)
    result = result.replace(/[✓✔☑→•■◆]/g, '');

    // Длинное тире в середине предложения заменяем на запятую или убираем
    result = result.replace(/\s—\s/g, ', ');
    result = result.replace(/\s—$/gm, '');

    // Добавить переносы строк перед нумерованными пунктами (1. 2. 3.)
    // Если номер идёт после текста без переноса — добавляем перенос
    result = result.replace(/([^\n])\s+(\d+)\.\s+([А-ЯA-Z])/g, '$1\n\n$2. $3');

    // Добавить перенос после параметров офиса перед следующим номером
    // Паттерн: "свободен сейчас 2." -> "свободен сейчас\n\n2."
    result = result.replace(/(свободен[^\n]*?)\s+(\d+)\./gi, '$1\n\n$2.');
    result = result.replace(/(₽\/мес[^\n]*?)\s+(\d+)\./gi, '$1\n\n$2.');

    // Убрать лишние пробелы (но НЕ переносы строк)
    result = result.replace(/[ \t]+/g, ' ');

    // Убрать пробелы в начале строк
    result = result.replace(/\n +/g, '\n');

    // Убрать пробел перед пунктуацией
    result = result.replace(/\s+([,.:!?])/g, '$1');

    // Исправить оборванные предложения (запятая в конце)
    result = result.trim();
    if (result.endsWith(',')) {
      // Убираем запятую и добавляем подходящий конец
      result = result.slice(0, -1).trim();
      // Если предложение выглядит как вопрос — добавляем ?
      if (result.toLowerCase().includes('хотите') ||
          result.toLowerCase().includes('интересно') ||
          result.toLowerCase().includes('подходит')) {
        result += '?';
      } else {
        result += '.';
      }
    }

    // Первая буква заглавная после очистки
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result.trim();
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
