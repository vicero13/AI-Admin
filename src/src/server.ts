// ============================================================
// Server Entry Point - AI-агент первой линии поддержки
// ============================================================

import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { TelegramAdapter, TelegramWebhookConfig } from './adapters/telegram';
import { AIEngine } from './ai/engine';
import { KnowledgeBase } from './knowledge/knowledge-base';
import { ContextManager } from './core/context-manager';
import { SituationDetector } from './core/situation-detector';
import { HumanMimicry } from './core/human-mimicry';
import { HandoffSystem } from './core/handoff-system';
import { Orchestrator, OrchestratorConfig } from './core/orchestrator';
import { DataLayer, DataLayerConfig } from './data';
import { createCache } from './utils/cache-factory';
import { ICache } from './utils/cache';
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
  console.log('  AI First-Line Support Agent');
  console.log('  Запуск системы...');
  console.log('================================================');

  // 1. Загрузить конфигурацию
  const config = await loadConfig();

  const telegramToken = process.env.TELEGRAM_TOKEN || config.telegram?.token;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  const port = Number(process.env.PORT) || config.server?.port || 3000;

  if (!telegramToken) {
    console.error('[FATAL] TELEGRAM_TOKEN не задан. Установите переменную окружения.');
    process.exit(1);
  }

  if (!anthropicApiKey) {
    console.error('[FATAL] ANTHROPIC_API_KEY не задан. Установите переменную окружения.');
    process.exit(1);
  }

  // 2. Personality
  const personality: PersonalityProfile = config.personality || {
    name: 'Анна',
    role: 'менеджер коворкинга',
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
      formalityLevel: 'casual',
    },
    patterns: {
      greetings: ['Привет!', 'Здравствуйте!', 'Добрый день!'],
      farewells: ['До встречи!', 'Удачного дня!'],
      acknowledgments: ['Поняла!', 'Ага, секунду'],
      delays: ['Минуточку...', 'Сейчас посмотрю...'],
      apologies: ['Извини за ожидание!'],
      transitions: ['Кстати,', 'А ещё'],
      fillers: ['ну', 'вот'],
      preferredPhrases: ['С удовольствием помогу!'],
    },
    restrictions: {
      avoidWords: ['я AI', 'я бот', 'я искусственный интеллект', 'я не человек'],
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
  const contextManager = new ContextManager();
  console.log('[Init] ✅ Context Manager');

  // Situation Detector
  const situationDetector = new SituationDetector(detectionThresholds);
  console.log('[Init] ✅ Situation Detector');

  // Human Mimicry
  const humanMimicry = new HumanMimicry(personality);
  console.log('[Init] ✅ Human Mimicry');

  // AI Engine
  // Pass API key through config metadata
  aiEngineConfig.metadata = { apiKey: anthropicApiKey };
  const aiEngine = new AIEngine(aiEngineConfig);
  aiEngine.initialize();
  console.log('[Init] ✅ AI Engine (Anthropic)');

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

  // Orchestrator
  const orchestratorConfig: OrchestratorConfig = {
    aiEngine: aiEngineConfig,
    personality,
    situationDetection: detectionThresholds,
    handoff: handoffConfig,
    knowledgeBasePath,
    limits: {
      maxMessageLength: 2000,
      maxConversationDuration: 86400, // 24h
      maxInactiveTime: 3600, // 1h
    },
  };

  const orchestrator = new Orchestrator(orchestratorConfig, {
    contextManager,
    situationDetector,
    humanMimicry,
    handoffSystem,
    aiEngine,
    knowledgeBase,
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

  telegramAdapter.setMessageHandler(async (message) => {
    try {
      const result = await orchestrator.handleIncomingMessage(message);

      if (result) {
        // Extract businessConnectionId for business messages
        const businessConnectionId = message.metadata?.custom?.businessConnectionId as string | undefined;

        // Имитация набора текста
        await telegramAdapter.sendTypingIndicator(message.conversationId, businessConnectionId);

        // Задержка для имитации набора
        await sleep(Math.min(result.typingDelay, 4000));

        // Отправить ответ (through business channel if applicable)
        await telegramAdapter.sendMessage(
          message.conversationId,
          result.responseText,
          businessConnectionId,
        );
      }
    } catch (error) {
      console.error('[Server] Ошибка обработки сообщения:', error);

      try {
        const businessConnectionId = message.metadata?.custom?.businessConnectionId as string | undefined;
        await telegramAdapter.sendMessage(
          message.conversationId,
          'Ой, что-то пошло не так. Попробуй написать ещё раз!',
          businessConnectionId,
        );
      } catch {
        console.error('[Server] Не удалось отправить сообщение об ошибке');
      }
    }
  });

  await telegramAdapter.initialize();
  const mode = telegramAdapter.isWebhookMode() ? 'webhook' : 'polling';
  console.log(`[Init] ✅ Telegram Adapter запущен (${mode})`);

  // 8. HTTP сервер (healthcheck + метрики)
  const app = express();
  app.use(express.json());

  // Webhook endpoint for Telegram (if webhook mode)
  if (telegramAdapter.isWebhookMode()) {
    const whPath = telegramAdapter.getWebhookPath();
    app.post(whPath, telegramAdapter.getWebhookMiddleware());
    console.log(`[Init] 📡 Webhook endpoint: POST ${whPath}`);
  }

  app.get('/health', (_req, res) => {
    const metrics = orchestrator.getMetrics();
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      mode,
      ...metrics,
      telegram: telegramAdapter.getMetrics(),
    });
  });

  app.get('/metrics', (_req, res) => {
    const metrics = orchestrator.getMetrics();
    res.json({
      ...metrics,
      telegram: telegramAdapter.getMetrics(),
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

  // Проверка режима диалога
  app.get('/api/conversations/:id/mode', (req, res) => {
    const { id } = req.params;
    const isHuman = orchestrator.isHumanMode(id);
    res.json({ conversationId: id, mode: isHuman ? 'human' : 'ai' });
  });

  app.listen(port, () => {
    console.log('================================================');
    console.log(`  🚀 Сервер запущен на порту ${port}`);
    console.log(`  📡 Health: http://localhost:${port}/health`);
    console.log(`  📊 Metrics: http://localhost:${port}/metrics`);
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
