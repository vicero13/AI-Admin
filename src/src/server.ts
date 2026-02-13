// ============================================================
// Server Entry Point - AI-агент первой линии поддержки (v2.0)
// ============================================================

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { createAdminRouter } from './admin';
import { TelegramAdapter, TelegramWebhookConfig } from './adapters/telegram';
import { AIEngine } from './ai/engine';
import { KnowledgeBase } from './knowledge/knowledge-base';
import { ContextManager } from './core/context-manager';
import { SituationDetector } from './core/situation-detector';
import { HumanMimicry } from './core/human-mimicry';
import { HandoffSystem } from './core/handoff-system';
import { Orchestrator, OrchestratorConfig, OrchestratorResponse } from './core/orchestrator';
import { ResourceManager, ResourcesConfig } from './core/resource-manager';
import { DataLayer, DataLayerConfig } from './data';
import { createCache } from './utils/cache-factory';
import { ICache } from './utils/cache';
import { WorkingHoursService, WorkingHoursConfig } from './core/working-hours';
import { ResponseDelayService, ResponseDelayConfig } from './core/response-delay';
import { GreetingService, GreetingConfig } from './core/greeting-service';
import { ContactQualifier, QualifierConfig } from './core/contact-qualifier';
import { StrangeQuestionHandler, StrangeQuestionConfig } from './core/strange-question-handler';
import { FollowUpService, FollowUpConfig } from './core/followup-service';
import { SummaryService, SummaryConfig } from './core/summary-service';
import { MediaResourceService, MediaResourceConfig } from './core/media-resource-service';
import { ConversationDetector, ConversationDetectorConfig } from './core/conversation-detector';
import { OperatorRequestHandler, OperatorRequestConfig } from './core/operator-request-handler';
import {
  AIProvider,
  PlatformType,
  HandoffReasonType,
  EmotionalState,
  LogLevel,
  PersonalityProfile,
  DetectionThresholds,
  HandoffConfig,
  AIEngineConfig,
} from './types';

// Загрузка .env
dotenv.config();

async function loadConfig(): Promise<any> {
  const configPath = path.resolve(__dirname, '../config/default.yaml');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return YAML.parse(raw);
  }
  console.warn('[Config] Файл конфигурации не найден, используются значения по умолчанию');
  return {};
}

async function main() {
  console.log('================================================');
  console.log('  AI First-Line Support Agent v2.0');
  console.log('  Запуск системы...');
  console.log('================================================');

  // 1. Загрузить конфигурацию
  const config = await loadConfig();

  const telegramToken = process.env.TELEGRAM_TOKEN || config.telegram?.token;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const aiProvider = config.ai?.provider || 'anthropic';
  const aiApiKey = aiProvider === 'openai' ? openaiApiKey : anthropicApiKey;
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  const port = Number(process.env.PORT) || config.server?.port || 3000;

  if (!telegramToken) {
    console.error('[FATAL] TELEGRAM_TOKEN не задан. Установите переменную окружения.');
    process.exit(1);
  }

  if (!aiApiKey) {
    const envVar = aiProvider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
    console.error(`[FATAL] ${envVar} не задан. Установите переменную окружения.`);
    process.exit(1);
  }

  // 2. Personality
  const personality: PersonalityProfile = config.personality || {
    name: 'Валерия',
    role: 'менеджер коворкинга ElasticSpace',
    style: 'friendly',
    traits: {
      emojiUsage: 'moderate',
      emojiFrequency: 0.3,
      preferredEmojis: ['😊', '👍', '✨'],
      punctuation: 'casual',
      vocabulary: 'moderate',
      empathy: 'high',
      enthusiasm: 'moderate',
      usesHumor: true,
      formalityLevel: 'formal',
    },
    patterns: {
      greetings: ['Здравствуйте!', 'Добрый день!'],
      farewells: ['До встречи!', 'Удачного дня!'],
      acknowledgments: ['Поняла!', 'Секунду'],
      delays: ['Минуточку...', 'Сейчас посмотрю...'],
      apologies: ['Извините за ожидание!'],
      transitions: ['Кстати,', 'А ещё'],
      fillers: ['вот'],
      preferredPhrases: ['С удовольствием помогу!'],
    },
    restrictions: {
      avoidWords: [
        'я AI', 'я бот', 'я искусственный интеллект', 'я не человек',
        'я программа', 'я языковая модель', 'ты', 'твой', 'твоего',
      ],
      avoidTopics: ['политика', 'религия'],
      maxMessageLength: 500,
      avoidStyles: ['academic'],
    },
  };

  // 3. Detection thresholds
  const detectionThresholds: DetectionThresholds = config.situationDetection || {
    aiProbing: { minConfidence: 0.6, handoffThreshold: 0.8 },
    complexity: { maxScore: 70, handoffThreshold: 75 },
    emotional: { escalationThreshold: 0.7, handoffStates: [EmotionalState.ANGRY] },
    confidence: { minScore: 40, handoffThreshold: 30 },
  };

  // 4. Handoff config
  const handoffConfig: HandoffConfig = config.handoff || {
    autoHandoffTriggers: [
      HandoffReasonType.AI_PROBING,
      HandoffReasonType.EMOTIONAL_ESCALATION,
      HandoffReasonType.LOW_CONFIDENCE,
    ],
    notificationChannels: ['telegram'],
    stallingMessages: ['Минуточку, уточню информацию...', 'Секундочку, проверю...'],
    customStallingMessages: {},
    estimatedWaitTime: 120,
    maxWaitBeforeEscalation: 300,
  };

  // 5. AI Engine config
  const aiEngineConfig: AIEngineConfig = {
    provider: AIProvider.ANTHROPIC,
    model: config.ai?.model || 'claude-3-sonnet-20240229',
    temperature: config.ai?.temperature || 0.7,
    maxTokens: config.ai?.maxTokens || 500,
    systemPrompt: '',
    cacheEnabled: config.ai?.cacheEnabled || true,
    cacheTTL: config.ai?.cacheTTL || 1800,
  };

  // 6. DataLayer (PostgreSQL / in-memory)
  const dbType = (process.env.DATABASE_TYPE || config.database?.type || 'memory') as 'memory' | 'postgres';
  const dataLayerConfig: DataLayerConfig = {
    type: dbType,
    postgres: dbType === 'postgres' ? {
      host: process.env.POSTGRES_HOST || config.database?.postgres?.host || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || config.database?.postgres?.port || 5432,
      database: process.env.POSTGRES_DB || config.database?.postgres?.database || 'ai_admin',
      user: process.env.POSTGRES_USER || config.database?.postgres?.user || 'ai_admin',
      password: process.env.POSTGRES_PASSWORD || config.database?.postgres?.password || 'ai_admin',
      maxConnections: config.database?.postgres?.maxConnections || 10,
    } : undefined,
  };
  const dataLayer = new DataLayer(dataLayerConfig);
  await dataLayer.initialize();
  console.log(`[Init] ✅ DataLayer (${dbType})`);

  // 7. Cache (Redis / in-memory)
  const redisEnabled = process.env.REDIS_ENABLED === 'true' || config.redis?.enabled === true;
  const cacheInstance: ICache = createCache({
    defaultTTL: (config.ai?.cacheTTL ?? 1800) * 1000,
    cleanupInterval: 60_000,
    redis: redisEnabled ? {
      host: process.env.REDIS_HOST || config.redis?.host || 'localhost',
      port: Number(process.env.REDIS_PORT) || config.redis?.port || 6379,
      password: process.env.REDIS_PASSWORD || config.redis?.password,
      db: config.redis?.db ?? 0,
      keyPrefix: config.redis?.keyPrefix ?? 'ai-admin:',
    } : undefined,
  });

  // 8. Инициализация компонентов
  console.log('[Init] Инициализация компонентов...');

  // Knowledge Base
  const knowledgeBasePath = path.resolve(
    __dirname,
    '..',
    config.knowledgeBasePath || './knowledge-base'
  );
  const knowledgeBase = new KnowledgeBase({
    basePath: knowledgeBasePath,
    confidenceThreshold: 0.3,
    autoReload: false,
  });
  try {
    await knowledgeBase.initialize();
    console.log('[Init] ✅ База знаний загружена');
  } catch (err) {
    console.warn('[Init] ⚠️ Ошибка загрузки базы знаний:', err);
    console.warn('[Init] Продолжаем без базы знаний...');
  }

  // Context Manager
  const contextManager = new ContextManager({
    sessionExpiryHours: config.context?.sessionExpiryHours,
    maxHistoryLength: config.context?.maxHistoryLength,
  });
  console.log('[Init] ✅ Context Manager');

  // Situation Detector
  const situationDetector = new SituationDetector(detectionThresholds);
  console.log('[Init] ✅ Situation Detector');

  // Human Mimicry
  const humanMimicry = new HumanMimicry(personality);
  console.log('[Init] ✅ Human Mimicry');

  // AI Engine
  aiEngineConfig.metadata = { apiKey: aiApiKey };
  const aiEngine = new AIEngine(aiEngineConfig);
  aiEngine.initialize();
  console.log(`[Init] ✅ AI Engine (${aiProvider}, model: ${aiEngineConfig.model})`);

  // Telegram Adapter для уведомлений менеджеру
  let notifyManager: (message: string, priority: string) => Promise<void>;
  if (adminTelegramId) {
    const TelegramBot = require('node-telegram-bot-api');
    const notifyBot = new TelegramBot(telegramToken);
    notifyManager = async (message: string, _priority: string) => {
      try {
        await notifyBot.sendMessage(adminTelegramId, message, {
          parse_mode: 'Markdown',
        });
      } catch (err) {
        console.error('[Notify] Ошибка отправки уведомления менеджеру:', err);
      }
    };
    console.log('[Init] ✅ Уведомления менеджеру через Telegram');
  } else {
    notifyManager = async (message: string) => {
      console.log('[Notify] (нет ADMIN_TELEGRAM_ID) Уведомление:', message);
    };
    console.warn('[Init] ⚠️ ADMIN_TELEGRAM_ID не задан, уведомления будут в консоль');
  }

  // Handoff System
  const handoffSystem = new HandoffSystem(handoffConfig, notifyManager);
  console.log('[Init] ✅ Handoff System');

  // Resource Manager (optional)
  let resourceManager: ResourceManager | undefined;
  if (config.resources) {
    try {
      const resourceBasePath = path.resolve(__dirname, '..', config.resources.basePath || './resources');
      const resourcesConfig: ResourcesConfig = {
        basePath: resourceBasePath,
        links: config.resources.links || {},
        resources: config.resources.items || [],
      };
      resourceManager = new ResourceManager(resourcesConfig);
      console.log('[Init] ✅ Resource Manager');
    } catch (err) {
      console.warn('[Init] ⚠️ Ошибка загрузки ресурсов:', err);
    }
  }

  // === Новые бизнес-сервисы ===

  // Working Hours
  let workingHoursService: WorkingHoursService | undefined;
  if (config.workingHours?.enabled) {
    workingHoursService = new WorkingHoursService(config.workingHours as WorkingHoursConfig);
    console.log('[Init] ✅ Working Hours Service');
  }

  // Greeting Service
  let greetingService: GreetingService | undefined;
  if (config.greetings?.enabled) {
    greetingService = new GreetingService(
      config.greetings as GreetingConfig,
      aiEngine
    );
    console.log('[Init] ✅ Greeting Service');
  }

  // Contact Qualifier
  let contactQualifier: ContactQualifier | undefined;
  if (config.contactQualification?.enabled) {
    contactQualifier = new ContactQualifier(
      config.contactQualification as QualifierConfig,
      aiEngine
    );
    console.log('[Init] ✅ Contact Qualifier');
  }

  // Strange Question Handler
  let strangeQuestionHandler: StrangeQuestionHandler | undefined;
  if (config.strangeQuestions?.enabled) {
    strangeQuestionHandler = new StrangeQuestionHandler(
      config.strangeQuestions as StrangeQuestionConfig,
      aiEngine
    );
    console.log('[Init] ✅ Strange Question Handler');
  }

  // Summary Service
  let summaryService: SummaryService | undefined;
  if (config.summary?.enabled) {
    summaryService = new SummaryService(
      config.summary as SummaryConfig,
      aiEngine,
      notifyManager
    );
    console.log('[Init] ✅ Summary Service');
  }

  // Media Resource Service — загружаем из media.json (fallback на YAML)
  let mediaResourceService: MediaResourceService | undefined;
  const mediaJsonPath = path.resolve(knowledgeBasePath, 'media.json');
  let mediaConfig: MediaResourceConfig | null = null;

  if (fs.existsSync(mediaJsonPath)) {
    try {
      const raw = fs.readFileSync(mediaJsonPath, 'utf-8');
      mediaConfig = JSON.parse(raw) as MediaResourceConfig;
      console.log('[Init] Media config loaded from media.json');
    } catch (err) {
      console.warn('[Init] Failed to parse media.json:', err);
    }
  }

  if (!mediaConfig && config.mediaResources) {
    mediaConfig = config.mediaResources as MediaResourceConfig;
    console.log('[Init] Media config loaded from YAML (fallback)');
  }

  if (mediaConfig?.enabled) {
    mediaResourceService = new MediaResourceService(mediaConfig);
    console.log('[Init] ✅ Media Resource Service');
  }

  // Conversation Detector
  let conversationDetector: ConversationDetector | undefined;
  if (config.conversation?.enabled) {
    conversationDetector = new ConversationDetector(config.conversation as ConversationDetectorConfig);
    console.log('[Init] ✅ Conversation Detector');
  }

  // Operator Request Handler
  let operatorRequestHandler: OperatorRequestHandler | undefined;
  if (config.operatorRequest?.enabled) {
    operatorRequestHandler = new OperatorRequestHandler(config.operatorRequest as OperatorRequestConfig);
    console.log('[Init] ✅ Operator Request Handler');
  }

  // Orchestrator
  const orchestratorConfig: OrchestratorConfig = {
    aiEngine: aiEngineConfig,
    personality,
    situationDetection: detectionThresholds,
    handoff: handoffConfig,
    knowledgeBasePath,
    limits: {
      maxMessageLength: 2000,
      maxConversationDuration: 86400,
      maxInactiveTime: 3600,
    },
  };

  const orchestrator = new Orchestrator(orchestratorConfig, {
    contextManager,
    situationDetector,
    humanMimicry,
    handoffSystem,
    aiEngine,
    knowledgeBase,
    resourceManager,
    workingHoursService,
    greetingService,
    contactQualifier,
    strangeQuestionHandler,
    summaryService,
    mediaResourceService,
    conversationDetector,
    operatorRequestHandler,
  });

  await orchestrator.start();
  console.log('[Init] ✅ Orchestrator');

  // 7. Telegram Adapter (основной бот для клиентов)
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || config.telegram?.webhook?.url;
  const webhookConfig: TelegramWebhookConfig | undefined = webhookUrl ? {
    url: webhookUrl,
    path: process.env.TELEGRAM_WEBHOOK_PATH || config.telegram?.webhook?.path || '/webhook/telegram',
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || config.telegram?.webhook?.secret,
  } : undefined;

  const telegramAdapter = new TelegramAdapter(telegramToken, webhookConfig);

  // Response Delay Service (initialized after telegramAdapter)
  let responseDelayService: ResponseDelayService | undefined;
  if (config.responseDelays?.enabled) {
    responseDelayService = new ResponseDelayService(
      config.responseDelays as ResponseDelayConfig,
      telegramAdapter
    );
    console.log('[Init] ✅ Response Delay Service');
  }

  // Follow-Up Service (initialized after telegramAdapter)
  let followUpService: FollowUpService | undefined;
  if (config.followUp?.enabled) {
    followUpService = new FollowUpService(
      config.followUp as FollowUpConfig,
      aiEngine,
      telegramAdapter
    );
    // Inject into orchestrator (it was created without followUpService)
    (orchestrator as any).followUpService = followUpService;
    console.log('[Init] ✅ Follow-Up Service');
  }

  // Очередь отправки — гарантирует что ответы уходят в порядке получения сообщений
  const sendQueues: Map<string, Promise<void>> = new Map();

  // Ранний typing indicator: показываем "печатает" через 5-10с,
  // пока orchestrator ещё ждёт batch (30с) и обрабатывает AI.
  // После первого показа обновляем каждые 5с чтобы typing не исчезал.
  const earlyTypingState: Map<string, { initialTimer: ReturnType<typeof setTimeout>; refreshInterval?: ReturnType<typeof setInterval> }> = new Map();

  telegramAdapter.setMessageHandler(async (message) => {
    try {
      const businessConnectionId = TelegramAdapter.extractBusinessConnectionId(message);

      // Запускаем ранний typing indicator (через 5-10с)
      // Каждое новое сообщение сбрасывает таймер (как и batch в orchestrator)
      const existingState = earlyTypingState.get(message.conversationId);
      if (existingState) {
        clearTimeout(existingState.initialTimer);
        if (existingState.refreshInterval) clearInterval(existingState.refreshInterval);
        earlyTypingState.delete(message.conversationId);
      }
      if (responseDelayService?.isEnabled()) {
        const typingShowDelay = 5000 + Math.floor(Math.random() * 5001); // 5-10с
        const state: { initialTimer: ReturnType<typeof setTimeout>; refreshInterval?: ReturnType<typeof setInterval> } = {
          initialTimer: setTimeout(async () => {
            // Первый typing indicator
            try {
              await telegramAdapter.sendTypingIndicator(message.conversationId, businessConnectionId);
            } catch { /* ignore */ }
            // Обновляем каждые 5с
            state.refreshInterval = setInterval(async () => {
              try {
                await telegramAdapter.sendTypingIndicator(message.conversationId, businessConnectionId);
              } catch { /* ignore */ }
            }, 5000);
          }, typingShowDelay),
        };
        earlyTypingState.set(message.conversationId, state);
      }

      const result = await orchestrator.handleIncomingMessage(message);

      // Очистить ранний typing state (timer + interval)
      const pendingState = earlyTypingState.get(message.conversationId);
      if (pendingState) {
        clearTimeout(pendingState.initialTimer);
        if (pendingState.refreshInterval) clearInterval(pendingState.refreshInterval);
        earlyTypingState.delete(message.conversationId);
      }

      if (result) {
        // Ждём завершения предыдущей отправки для этого пользователя
        const prevSend = sendQueues.get(message.conversationId);

        const sendTask = (async () => {
          if (prevSend) await prevSend.catch(() => {});

          // Использовать ResponseDelayService если доступен
          if (responseDelayService?.isEnabled()) {
            await responseDelayService.executeDelay(
              message.conversationId,
              businessConnectionId,
              message.content.text || '',
              result.responseText,
              result.isGreeting,
              result.firstMessageReceivedAt
            );
          } else {
            await telegramAdapter.sendTypingIndicator(message.conversationId, businessConnectionId);
            await sleep(Math.min(result.typingDelay, 4000));
          }

          // Отправить основной ответ
          await telegramAdapter.sendMessage(
            message.conversationId,
            result.responseText,
            businessConnectionId,
          );

          // Helper: отправить один attachment (фото/видео/документ)
          const sendAttachment = async (att: typeof result.attachment) => {
            if (!att) return;
            const resolvedPath = att.filePath && !path.isAbsolute(att.filePath)
              ? path.resolve(__dirname, '../..', att.filePath)
              : att.filePath;
            const sendOpts = { caption: att.caption, businessConnectionId };

            if (att.type === 'photo' && resolvedPath) {
              await telegramAdapter.sendPhoto(message.conversationId, resolvedPath, sendOpts);
            } else if (att.type === 'video' && resolvedPath) {
              await telegramAdapter.sendVideo(message.conversationId, resolvedPath, sendOpts);
            } else if (att.type === 'file' && resolvedPath) {
              await telegramAdapter.sendDocument(message.conversationId, resolvedPath, sendOpts);
            }
          };

          // Отправить дополнительные сообщения (текст и/или медиа-файлы)
          if (result.additionalMessages) {
            for (const addMsg of result.additionalMessages) {
              if (addMsg.delayMs > 0) {
                await sleep(addMsg.delayMs);
              }

              if (addMsg.text) {
                await telegramAdapter.sendTypingIndicator(message.conversationId, businessConnectionId);
                await sleep(Math.min(1500 + Math.random() * 2000, 3000));
                await telegramAdapter.sendMessage(
                  message.conversationId,
                  addMsg.text,
                  businessConnectionId,
                );
              }

              if (addMsg.attachment) {
                await sendAttachment(addMsg.attachment);
              }
            }
          }

          // Отправить одиночный attachment (legacy / простые случаи)
          if (result.attachment) {
            await sendAttachment(result.attachment);
          }
        })();

        sendQueues.set(message.conversationId, sendTask);
        await sendTask;
        if (sendQueues.get(message.conversationId) === sendTask) {
          sendQueues.delete(message.conversationId);
        }
      }
    } catch (error) {
      console.error('[Server] Ошибка обработки сообщения:', error);

      try {
        await telegramAdapter.sendMessage(
          message.conversationId,
          'Извините, что-то пошло не так. Попробуйте написать ещё раз!',
          TelegramAdapter.extractBusinessConnectionId(message),
        );
      } catch {
        console.error('[Server] Не удалось отправить сообщение об ошибке');
      }
    }
  });

  // Автоматический сброс при очистке чата в Telegram
  telegramAdapter.setConversationResetHandler(async (conversationId: string) => {
    console.log(`[Server] Chat cleared for ${conversationId} — resetting conversation`);
    await orchestrator.resetConversation(conversationId);
  });

  await telegramAdapter.initialize();
  const mode = telegramAdapter.isWebhookMode() ? 'webhook' : 'polling';
  console.log(`[Init] ✅ Telegram Adapter запущен (${mode})`);

  // 8. HTTP сервер (healthcheck + метрики)
  const app = express();

  // CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [`http://localhost:${port}`, 'http://localhost:4000'];
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  app.use(express.json());

  // Rate limiting for admin API
  const adminApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Webhook endpoint for Telegram (if webhook mode)
  if (telegramAdapter.isWebhookMode()) {
    const whPath = telegramAdapter.getWebhookPath();
    app.post(whPath, telegramAdapter.getWebhookMiddleware());
    console.log(`[Init] 📡 Webhook endpoint: POST ${whPath}`);
  }

  app.get('/health', async (_req, res) => {
    const metrics = orchestrator.getMetrics();
    const webhookInfo = await telegramAdapter.getWebhookInfo();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      mode,
      ...metrics,
      telegram: {
        ...telegramAdapter.getMetrics(),
        ...(webhookInfo ? { webhook: webhookInfo } : {}),
      },
    });
  });

  app.get('/ready', (_req, res) => {
    const metrics = orchestrator.getMetrics();
    if (metrics.running) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  app.get('/metrics', async (_req, res) => {
    const metrics = orchestrator.getMetrics();
    const webhookInfo = await telegramAdapter.getWebhookInfo();
    res.json({
      ...metrics,
      telegram: {
        ...telegramAdapter.getMetrics(),
        ...(webhookInfo ? { webhook: webhookInfo } : {}),
      },
    });
  });

  // Ручное переключение в AI mode
  app.post('/api/conversations/:id/ai-mode', async (req, res) => {
    const { id } = req.params;
    try {
      await orchestrator.switchToAIMode(id);
      res.json({ status: 'ok', conversationId: id, mode: 'ai' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to switch mode' });
    }
  });

  // Полный сброс разговора (для тестирования: очистка чата → новый контакт)
  app.post('/api/conversations/:id/reset', async (req, res) => {
    const { id } = req.params;
    try {
      await orchestrator.resetConversation(id);
      res.json({ status: 'ok', conversationId: id, message: 'Conversation fully reset — next message will be treated as new contact' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset conversation' });
    }
  });

  // Проверка режима диалога
  app.get('/api/conversations/:id/mode', (req, res) => {
    const { id } = req.params;
    const isHuman = orchestrator.isHumanMode(id);
    res.json({ conversationId: id, mode: isHuman ? 'human' : 'ai' });
  });

  // Admin Panel
  if (config.admin?.enabled) {
    const adminRouter = createAdminRouter({
      dataLayer,
      knowledgeBase,
      orchestrator,
      configPath: path.resolve(__dirname, '../config/default.yaml'),
      knowledgeBasePath,
      anthropicApiKey: anthropicApiKey || '',
      openaiApiKey: openaiApiKey || '',
      aiProvider: aiProvider,
    });
    app.use('/', adminRouter);
    console.log('[Init] ✅ Admin panel enabled');
  }

  // Hot-reload медиа конфига (вызывается из admin-panel после сохранения)
  app.post('/api/admin/reload-media', (_req, res) => {
    try {
      if (!fs.existsSync(mediaJsonPath)) {
        return res.status(404).json({ error: 'media.json not found' });
      }
      const raw = fs.readFileSync(mediaJsonPath, 'utf-8');
      const newConfig = JSON.parse(raw) as MediaResourceConfig;

      if (mediaResourceService) {
        mediaResourceService.updateConfig(newConfig);
      } else if (newConfig.enabled) {
        mediaResourceService = new MediaResourceService(newConfig);
        (orchestrator as any).mediaResourceService = mediaResourceService;
      }
      console.log('[Hot-reload] ✅ Media config reloaded');
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Hot-reload] ❌ Failed to reload media:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => {
    console.log('================================================');
    console.log(`  🚀 Сервер запущен на порту ${port}`);
    console.log(`  📡 Health: http://localhost:${port}/health`);
    console.log(`  📊 Metrics: http://localhost:${port}/metrics`);
    if (config.admin?.enabled) {
      console.log(`  🔧 Admin: http://localhost:${port}/admin`);
    }
    console.log('================================================');
  });

  // Очистка устаревших контекстов каждый час
  setInterval(async () => {
    const oneHourAgo = Date.now() - 3600 * 1000;
    const cleaned = await contextManager.expireOldContexts(oneHourAgo);
    if (cleaned > 0) {
      console.log(`[Cleanup] Очищено ${cleaned} устаревших контекстов`);
    }
  }, 3600 * 1000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Shutdown] Завершение работы...');
    await orchestrator.stop();
    await telegramAdapter.shutdown();
    await cacheInstance.destroy();
    await dataLayer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('[FATAL] Критическая ошибка:', error);
  process.exit(1);
});
