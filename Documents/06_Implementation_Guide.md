# Implementation Guide - Руководство по реализации

## 1. Введение

Этот документ описывает пошаговую реализацию AI-агента первой линии поддержки.

### 1.1 Что будем строить

**AI-агент**, который:
- ✅ Общается в мессенджерах (Telegram, WhatsApp, VK)
- ✅ Имитирует живого менеджера
- ✅ Отвечает на типовые вопросы
- ✅ Передаёт сложные ситуации менеджеру
- ✅ Не раскрывает свою природу

### 1.2 Целевые метрики

После внедрения ожидаем:
- **70-80%** диалогов обработаны AI
- **<5%** случаев раскрытия AI
- **20-30%** передач менеджеру
- **>4.5/5** удовлетворённость клиентов

## 2. Технологический стек

### 2.1 Рекомендуемый стек

```yaml
Backend:
  Language: TypeScript/Node.js или Python
  Framework: Express/Fastify (Node.js) или FastAPI (Python)
  Runtime: Node.js 18+ или Python 3.11+

AI Provider:
  Primary: Anthropic Claude (claude-3-sonnet или claude-3-opus)
  Fallback: OpenAI GPT-4
  
Database:
  Primary: PostgreSQL 15+ (для структурированных данных)
  Cache: Redis 7+ (для сессий и кэша)
  
Messengers:
  Telegram: node-telegram-bot-api или python-telegram-bot
  WhatsApp: Twilio API или WhatsApp Business API
  VK: vk-io или vk_api
  
Infrastructure:
  Containerization: Docker + Docker Compose
  Orchestration: Kubernetes (опционально для продакшена)
  Monitoring: Prometheus + Grafana
  Logging: Winston/Pino или structlog
  
Additional:
  Queue: BullMQ (Node.js) или Celery (Python)
  File Storage: MinIO или AWS S3
  Secret Management: HashiCorp Vault или AWS Secrets Manager
```

### 2.2 Альтернативный минимальный стек

Для быстрого старта и MVP:

```yaml
Backend: Python + FastAPI
AI: Anthropic Claude
Database: SQLite (позже мигрировать на PostgreSQL)
Cache: In-memory dict (позже на Redis)
Messengers: Telegram только (позже добавить остальные)
Deployment: Docker на одном сервере
```

## 3. Архитектура проекта

### 3.1 Структура директорий

```
ai-support-agent/
├── src/
│   ├── adapters/              # Messenger adapters
│   │   ├── telegram.ts
│   │   ├── whatsapp.ts
│   │   └── vk.ts
│   ├── core/                  # Core business logic
│   │   ├── orchestrator.ts
│   │   ├── context-manager.ts
│   │   ├── situation-detector.ts
│   │   ├── human-mimicry.ts
│   │   └── handoff-system.ts
│   ├── ai/                    # AI integration
│   │   ├── engine.ts
│   │   └── providers/
│   │       ├── anthropic.ts
│   │       └── openai.ts
│   ├── knowledge/             # Knowledge base
│   │   ├── knowledge-base.ts
│   │   └── loader.ts
│   ├── data/                  # Data layer
│   │   ├── repositories/
│   │   │   ├── conversation.ts
│   │   │   ├── client.ts
│   │   │   ├── handoff.ts
│   │   │   └── logs.ts
│   │   └── models/
│   │       └── *.model.ts
│   ├── utils/                 # Utilities
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── cache.ts
│   │   └── metrics.ts
│   └── server.ts              # Main entry point
├── knowledge-base/            # Knowledge base files
│   ├── business-info.json
│   ├── services.json
│   ├── faq/
│   ├── policies/
│   ├── dialogs/
│   └── team.json
├── config/                    # Configuration
│   ├── default.yaml
│   ├── development.yaml
│   └── production.yaml
├── tests/                     # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/                    # Docker files
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/                   # Utility scripts
│   ├── setup.sh
│   └── migrate.sh
├── docs/                      # Documentation
├── .env.example
├── package.json
└── README.md
```

## 4. Пошаговая реализация

### 4.1 Фаза 1: Подготовка и настройка (1-2 дня)

#### Шаг 1.1: Инициализация проекта

```bash
# Создать проект
mkdir ai-support-agent
cd ai-support-agent

# Инициализировать Node.js проект
npm init -y

# Установить зависимости
npm install express typescript @types/node
npm install @anthropic-ai/sdk node-telegram-bot-api
npm install pg redis winston dotenv
npm install --save-dev nodemon ts-node @types/express

# Настроить TypeScript
npx tsc --init
```

#### Шаг 1.2: Создать базовую структуру

```bash
mkdir -p src/{adapters,core,ai,knowledge,data,utils}
mkdir -p knowledge-base/{faq,policies,dialogs}
mkdir -p config tests docker scripts docs
```

#### Шаг 1.3: Настроить конфигурацию

**config/default.yaml:**
```yaml
server:
  port: 3000
  host: 0.0.0.0

ai:
  provider: anthropic
  model: claude-3-sonnet-20240229
  temperature: 0.7
  max_tokens: 500

database:
  host: localhost
  port: 5432
  database: ai_support
  user: postgres
  password: ${DB_PASSWORD}

redis:
  host: localhost
  port: 6379

telegram:
  token: ${TELEGRAM_TOKEN}
  
logging:
  level: info
  
handoff:
  notification_channels: [telegram]
```

**.env.example:**
```env
NODE_ENV=development

# AI Provider
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Database
DB_PASSWORD=postgres

# Messengers
TELEGRAM_TOKEN=your_bot_token
WHATSAPP_TOKEN=your_token

# Admin Telegram
ADMIN_TELEGRAM_ID=your_telegram_id

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### 4.2 Фаза 2: Базовая функциональность (3-5 дней)

#### Шаг 2.1: Реализовать Telegram Adapter

**src/adapters/telegram.ts:**
```typescript
import TelegramBot from 'node-telegram-bot-api';
import { IMessengerAdapter, UniversalMessage } from '../types';

export class TelegramAdapter implements IMessengerAdapter {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
  }

  async initialize(): Promise<void> {
    this.bot.on('message', async (msg) => {
      const universalMessage = this.convertToUniversal(msg);
      await this.onMessage(universalMessage);
    });
    
    console.log('Telegram bot started');
  }

  private convertToUniversal(msg: any): UniversalMessage {
    return {
      messageId: msg.message_id.toString(),
      conversationId: msg.chat.id.toString(),
      userId: msg.from.id.toString(),
      timestamp: msg.date * 1000,
      platform: 'telegram',
      platformMessageId: msg.message_id.toString(),
      content: {
        type: 'text',
        text: msg.text
      },
      metadata: {}
    };
  }

  async sendMessage(message: UniversalMessage): Promise<void> {
    await this.bot.sendMessage(
      message.conversationId,
      message.content.text!
    );
  }

  async sendTypingIndicator(conversationId: string): Promise<void> {
    await this.bot.sendChatAction(conversationId, 'typing');
  }

  private onMessage: (msg: UniversalMessage) => Promise<void>;

  setMessageHandler(handler: (msg: UniversalMessage) => Promise<void>) {
    this.onMessage = handler;
  }
}
```

#### Шаг 2.2: Реализовать AI Engine

**src/ai/engine.ts:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AIRequest, AIResponse } from '../types';

export class AIEngine {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const messages = this.buildMessages(request);
    
    const response = await this.client.messages.create({
      model: request.model || 'claude-3-sonnet-20240229',
      max_tokens: request.maxTokens || 500,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: messages
    });

    return {
      text: response.content[0].text,
      metadata: {
        provider: 'anthropic',
        model: response.model,
        tokensUsed: response.usage.output_tokens,
        latency: 0,
        confidence: 0.8,
        finishReason: response.stop_reason,
        cached: false,
        timestamp: Date.now()
      }
    };
  }

  private buildMessages(request: AIRequest) {
    // Построить массив сообщений из контекста
    const messages = request.context.messageHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Добавить текущее сообщение
    messages.push({
      role: 'user',
      content: request.message
    });

    return messages;
  }
}
```

#### Шаг 2.3: Реализовать Knowledge Base

**src/knowledge/knowledge-base.ts:**
```typescript
import fs from 'fs/promises';
import path from 'path';

export class KnowledgeBase {
  private data: any = {};

  async load(basePath: string): Promise<void> {
    // Загрузить business-info
    this.data.businessInfo = await this.loadJson(
      path.join(basePath, 'business-info.json')
    );

    // Загрузить services
    this.data.services = await this.loadJson(
      path.join(basePath, 'services.json')
    );

    // Загрузить FAQ
    this.data.faq = await this.loadFAQ(
      path.join(basePath, 'faq')
    );

    console.log('Knowledge base loaded');
  }

  async search(query: string): Promise<any[]> {
    // Простой поиск по FAQ
    const results = [];
    
    for (const faqItem of this.data.faq) {
      if (this.matches(query, faqItem)) {
        results.push({
          item: faqItem,
          relevance: 0.9,
          matchedTerms: [query]
        });
      }
    }

    return results;
  }

  private matches(query: string, faqItem: any): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Поиск в вопросе
    if (faqItem.question.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Поиск в альтернативных вопросах
    for (const altQ of faqItem.alternativeQuestions || []) {
      if (altQ.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }

    return false;
  }

  private async loadJson(filepath: string): Promise<any> {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  private async loadFAQ(dirPath: string): Promise<any[]> {
    const files = await fs.readdir(dirPath);
    const allFaq = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const faqData = await this.loadJson(
          path.join(dirPath, file)
        );
        allFaq.push(...faqData.items);
      }
    }

    return allFaq;
  }

  getBusinessInfo() {
    return this.data.businessInfo;
  }

  getServices() {
    return this.data.services;
  }
}
```

#### Шаг 2.4: Реализовать Orchestrator (упрощённый)

**src/core/orchestrator.ts:**
```typescript
import { UniversalMessage } from '../types';
import { AIEngine } from '../ai/engine';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { ContextManager } from './context-manager';

export class Orchestrator {
  constructor(
    private aiEngine: AIEngine,
    private knowledgeBase: KnowledgeBase,
    private contextManager: ContextManager
  ) {}

  async handleMessage(message: UniversalMessage): Promise<string> {
    // 1. Получить контекст
    const context = await this.contextManager.getContext(
      message.conversationId
    );

    // 2. Добавить сообщение в историю
    await this.contextManager.addMessage(message.conversationId, {
      messageId: message.messageId,
      timestamp: message.timestamp,
      role: 'user',
      content: message.content.text!,
      handledBy: 'ai'
    });

    // 3. Поиск в базе знаний
    const knowledgeResults = await this.knowledgeBase.search(
      message.content.text!
    );

    // 4. Сформировать запрос к AI
    const aiRequest = {
      message: message.content.text!,
      context: context,
      relevantKnowledge: knowledgeResults,
      systemPrompt: this.buildSystemPrompt(),
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 500
    };

    // 5. Получить ответ от AI
    const aiResponse = await this.aiEngine.generateResponse(aiRequest);

    // 6. Сохранить ответ в историю
    await this.contextManager.addMessage(message.conversationId, {
      messageId: `ai-${Date.now()}`,
      timestamp: Date.now(),
      role: 'assistant',
      content: aiResponse.text,
      handledBy: 'ai'
    });

    return aiResponse.text;
  }

  private buildSystemPrompt(): string {
    return `Ты - Анна, менеджер коворкинга "Пространство".

Общайся естественно, дружелюбно, используй эмодзи умеренно.
Отвечай только на основе базы знаний.
Если не знаешь ответ - скажи "Дай уточню".
НИКОГДА не говори что ты AI или бот.`;
  }
}
```

### 4.3 Фаза 3: Context & Situation Detection (2-3 дня)

#### Шаг 3.1: Реализовать Context Manager

**src/core/context-manager.ts:**
```typescript
export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();

  async getContext(conversationId: string): Promise<ConversationContext> {
    if (!this.contexts.has(conversationId)) {
      // Создать новый контекст
      const context: ConversationContext = {
        conversationId,
        userId: conversationId, // упрощение
        platform: 'telegram',
        sessionStarted: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 часа
        clientType: 'new',
        messageHistory: [],
        emotionalState: 'neutral',
        suspectAI: false,
        complexQuery: false,
        requiresHandoff: false,
        mode: 'ai',
        metadata: {}
      };

      this.contexts.set(conversationId, context);
    }

    return this.contexts.get(conversationId)!;
  }

  async addMessage(conversationId: string, message: ContextMessage) {
    const context = await this.getContext(conversationId);
    context.messageHistory.push(message);
    context.lastActivity = Date.now();

    // Ограничить историю последними 20 сообщениями
    if (context.messageHistory.length > 20) {
      context.messageHistory = context.messageHistory.slice(-20);
    }
  }

  async updateContext(
    conversationId: string,
    updates: Partial<ConversationContext>
  ) {
    const context = await this.getContext(conversationId);
    Object.assign(context, updates);
  }
}
```

#### Шаг 3.2: Реализовать Situation Detector (базовый)

**src/core/situation-detector.ts:**
```typescript
export class SituationDetector {
  detectAIProbing(message: string): AIProbeDetection {
    const aiProbingKeywords = [
      'ты бот',
      'ты ai',
      'ты робот',
      'ты программа',
      'ты человек',
      'любимый цвет',
      'что ты ел'
    ];

    const lowerMessage = message.toLowerCase();
    const detected = aiProbingKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    return {
      detected,
      confidence: detected ? 0.85 : 0.0,
      indicators: detected ? ['direct_question'] : [],
      probingType: 'direct',
      detectedPatterns: [],
      recommendation: detected ? 'handoff' : 'answer_naturally'
    };
  }

  async analyze(
    message: UniversalMessage,
    context: ConversationContext
  ): Promise<SituationAnalysis> {
    const aiProbing = this.detectAIProbing(message.content.text!);
    
    // Простая эмоциональная детекция
    const emotionalState = this.detectEmotion(message.content.text!);

    return {
      timestamp: Date.now(),
      conversationId: message.conversationId,
      messageId: message.messageId,
      aiProbing,
      complexity: { score: 0, factors: {}, recommendation: 'answer' },
      emotionalState,
      confidence: { score: 80, factors: {}, recommendation: 'send' },
      overallRisk: aiProbing.detected ? 'high' : 'low',
      requiresHandoff: aiProbing.detected,
      handoffReason: aiProbing.detected ? {
        type: 'ai_probing',
        description: 'Client is trying to detect AI',
        severity: 'high',
        detectedBy: 'situation_detector'
      } : undefined,
      urgency: aiProbing.detected ? 'urgent' : 'low',
      recommendations: []
    };
  }

  private detectEmotion(message: string): EmotionalStateDetection {
    const angryKeywords = ['ужас', 'кошмар', 'возмутительно'];
    const lowerMessage = message.toLowerCase();
    
    const isAngry = angryKeywords.some(k => lowerMessage.includes(k));

    return {
      state: isAngry ? 'angry' : 'neutral',
      confidence: 0.7,
      indicators: [],
      escalationRisk: isAngry ? 'high' : 'low'
    };
  }
}
```

### 4.4 Фаза 4: Handoff System (2-3 дня)

#### Шаг 4.1: Реализовать Handoff System

**src/core/handoff-system.ts:**
```typescript
import TelegramBot from 'node-telegram-bot-api';

export class HandoffSystem {
  private bot: TelegramBot;
  private adminChatId: string;

  constructor(token: string, adminChatId: string) {
    this.bot = new TelegramBot(token);
    this.adminChatId = adminChatId;
  }

  async initiateHandoff(
    conversationId: string,
    reason: HandoffReason,
    context: ConversationContext
  ): Promise<HandoffResult> {
    // 1. Создать handoff объект
    const handoff: Handoff = {
      handoffId: `handoff-${Date.now()}`,
      conversationId,
      userId: context.userId,
      reason,
      context,
      initiatedAt: Date.now(),
      status: 'pending',
      priority: reason.severity === 'high' ? 'urgent' : 'normal',
      metadata: {}
    };

    // 2. Сгенерировать stalling message
    const stallingMessage = this.generateStallingMessage(reason);

    // 3. Уведомить менеджера
    await this.notifyManager(handoff);

    // 4. Установить режим human
    await this.setHumanMode(conversationId);

    return {
      success: true,
      handoffId: handoff.handoffId,
      stallingMessage,
      estimatedWaitTime: 120, // 2 минуты
      notificationsSent: 1,
      metadata: {}
    };
  }

  private generateStallingMessage(reason: HandoffReason): string {
    const messages = {
      ai_probing: 'Минуточку, уточню информацию...',
      complex_query: 'Интересный вопрос! Дай минутку, проверю варианты...',
      emotional_escalation: 'Извини! Сейчас разберусь...',
      low_confidence: 'Дай уточню детали...'
    };

    return messages[reason.type] || 'Минуточку...';
  }

  private async notifyManager(handoff: Handoff): Promise<void> {
    const notification = this.formatNotification(handoff);
    
    await this.bot.sendMessage(
      this.adminChatId,
      notification,
      { parse_mode: 'Markdown' }
    );
  }

  private formatNotification(handoff: Handoff): string {
    const history = handoff.context.messageHistory
      .slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `🚨 *НОВАЯ ПЕРЕДАЧА*

⚠️ Причина: ${handoff.reason.type}
👤 Клиент: ${handoff.userId}
⏰ ${new Date(handoff.initiatedAt).toLocaleTimeString()}

💬 *Последние сообщения:*
${history}

Открыть диалог: /handoff_${handoff.handoffId}`;
  }

  private async setHumanMode(conversationId: string): Promise<void> {
    // Установить флаг что диалог в режиме human
    // Реализация зависит от вашей архитектуры
  }
}
```

### 4.5 Фаза 5: Интеграция и тестирование (3-5 дней)

#### Шаг 5.1: Собрать всё вместе

**src/server.ts:**
```typescript
import express from 'express';
import dotenv from 'dotenv';
import { TelegramAdapter } from './adapters/telegram';
import { AIEngine } from './ai/engine';
import { KnowledgeBase } from './knowledge/knowledge-base';
import { ContextManager } from './core/context-manager';
import { SituationDetector } from './core/situation-detector';
import { HandoffSystem } from './core/handoff-system';
import { Orchestrator } from './core/orchestrator';

dotenv.config();

async function main() {
  // 1. Инициализировать компоненты
  const aiEngine = new AIEngine(process.env.ANTHROPIC_API_KEY!);
  
  const knowledgeBase = new KnowledgeBase();
  await knowledgeBase.load('./knowledge-base');
  
  const contextManager = new ContextManager();
  const situationDetector = new SituationDetector();
  
  const handoffSystem = new HandoffSystem(
    process.env.TELEGRAM_TOKEN!,
    process.env.ADMIN_TELEGRAM_ID!
  );

  const orchestrator = new Orchestrator(
    aiEngine,
    knowledgeBase,
    contextManager
  );

  // 2. Настроить Telegram adapter
  const telegramAdapter = new TelegramAdapter(
    process.env.TELEGRAM_TOKEN!
  );

  telegramAdapter.setMessageHandler(async (message) => {
    try {
      // Получить контекст
      const context = await contextManager.getContext(
        message.conversationId
      );

      // Проверить режим
      if (context.mode === 'human') {
        // Диалог ведёт человек - пропустить
        return;
      }

      // Показать индикатор печати
      await telegramAdapter.sendTypingIndicator(
        message.conversationId
      );

      // Анализ ситуации
      const analysis = await situationDetector.analyze(
        message,
        context
      );

      // Проверить нужна ли передача
      if (analysis.requiresHandoff) {
        const handoffResult = await handoffSystem.initiateHandoff(
          message.conversationId,
          analysis.handoffReason!,
          context
        );

        // Отправить stalling message клиенту
        await telegramAdapter.sendMessage({
          ...message,
          content: { type: 'text', text: handoffResult.stallingMessage }
        });

        return;
      }

      // Обработать сообщение через orchestrator
      const response = await orchestrator.handleMessage(message);

      // Отправить ответ
      await telegramAdapter.sendMessage({
        ...message,
        content: { type: 'text', text: response }
      });

    } catch (error) {
      console.error('Error handling message:', error);
      
      // Отправить fallback сообщение
      await telegramAdapter.sendMessage({
        ...message,
        content: { 
          type: 'text', 
          text: 'Извини, произошла ошибка. Сейчас передам коллеге...' 
        }
      });
    }
  });

  await telegramAdapter.initialize();

  // 3. Запустить HTTP сервер (для healthcheck)
  const app = express();
  
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

main().catch(console.error);
```

#### Шаг 5.2: Создать Docker конфигурацию

**docker/Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Установить зависимости
COPY package*.json ./
RUN npm ci --only=production

# Скопировать код
COPY . .

# Собрать TypeScript
RUN npm run build

# Запустить
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      TELEGRAM_TOKEN: ${TELEGRAM_TOKEN}
      ADMIN_TELEGRAM_ID: ${ADMIN_TELEGRAM_ID}
      DB_HOST: postgres
      REDIS_HOST: redis
    volumes:
      - ./knowledge-base:/app/knowledge-base
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_support
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Шаг 5.3: Тестирование

**tests/integration/orchestrator.test.ts:**
```typescript
import { describe, it, expect } from '@jest/globals';
import { Orchestrator } from '../../src/core/orchestrator';

describe('Orchestrator', () => {
  it('should handle simple greeting', async () => {
    // Arrange
    const message = createTestMessage('Привет!');
    
    // Act
    const response = await orchestrator.handleMessage(message);
    
    // Assert
    expect(response).toContain('Привет');
    expect(response.length).toBeGreaterThan(0);
  });

  it('should detect AI probing', async () => {
    // Arrange
    const message = createTestMessage('Ты бот?');
    
    // Act
    const analysis = await situationDetector.analyze(
      message,
      context
    );
    
    // Assert
    expect(analysis.requiresHandoff).toBe(true);
    expect(analysis.handoffReason?.type).toBe('ai_probing');
  });
});
```

## 5. Заполнение базы знаний

### 5.1 Подготовка контента

```bash
# 1. Собрать информацию о бизнесе
- Адрес, часы работы
- Контакты
- Услуги и цены
- Правила

# 2. Составить FAQ (минимум 20 вопросов)
- Топ вопросы от клиентов
- Альтернативные формулировки

# 3. Собрать примеры диалогов (минимум 10)
- Успешные диалоги
- Диалоги с передачей
- Проблемные ситуации

# 4. Описать политики
- Отмена
- Возврат
- Правила
```

### 5.2 Валидация данных

```bash
# Проверить JSON файлы
node scripts/validate-knowledge-base.js

# Проверить покрытие FAQ
node scripts/check-faq-coverage.js
```

## 6. Деплоймент

### 6.1 Локальная разработка

```bash
# 1. Клонировать репозиторий
git clone <repo>
cd ai-support-agent

# 2. Установить зависимости
npm install

# 3. Настроить .env
cp .env.example .env
# Заполнить токены и ключи

# 4. Запустить
npm run dev
```

### 6.2 Продакшн (Docker)

```bash
# 1. Подготовить .env
cp .env.example .env.production
# Заполнить production значения

# 2. Собрать и запустить
docker-compose up -d

# 3. Проверить логи
docker-compose logs -f app

# 4. Проверить health
curl http://localhost:3000/health
```

### 6.3 Продакшн (Kubernetes)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-support-agent
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-support-agent
  template:
    metadata:
      labels:
        app: ai-support-agent
    spec:
      containers:
      - name: app
        image: your-registry/ai-support-agent:latest
        ports:
        - containerPort: 3000
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: anthropic-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## 7. Мониторинг и метрики

### 7.1 Настройка мониторинга

```typescript
// src/utils/metrics.ts
import client from 'prom-client';

export class MetricsCollector {
  private conversationCounter: client.Counter;
  private handoffCounter: client.Counter;
  private responseTime: client.Histogram;

  constructor() {
    this.conversationCounter = new client.Counter({
      name: 'conversations_total',
      help: 'Total conversations handled',
      labelNames: ['platform', 'outcome']
    });

    this.handoffCounter = new client.Counter({
      name: 'handoffs_total',
      help: 'Total handoffs to human',
      labelNames: ['reason', 'priority']
    });

    this.responseTime = new client.Histogram({
      name: 'response_time_seconds',
      help: 'AI response time',
      buckets: [0.1, 0.5, 1, 2, 5]
    });
  }

  trackConversation(platform: string, outcome: string) {
    this.conversationCounter.inc({ platform, outcome });
  }

  trackHandoff(reason: string, priority: string) {
    this.handoffCounter.inc({ reason, priority });
  }

  trackResponseTime(duration: number) {
    this.responseTime.observe(duration);
  }
}
```

### 7.2 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AI Support Agent",
    "panels": [
      {
        "title": "Conversations per Hour",
        "targets": [{
          "expr": "rate(conversations_total[1h])"
        }]
      },
      {
        "title": "Handoff Rate",
        "targets": [{
          "expr": "rate(handoffs_total[1h]) / rate(conversations_total[1h])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, response_time_seconds)"
        }]
      }
    ]
  }
}
```

## 8. Поддержка и обслуживание

### 8.1 Ежедневные задачи

```bash
# Проверить метрики
curl http://localhost:3000/metrics

# Проверить логи
docker-compose logs -f app | grep ERROR

# Проверить handoff'ы
curl http://localhost:3000/api/handoffs/pending
```

### 8.2 Еженедельные задачи

```bash
# Анализ handoff'ов
node scripts/analyze-handoffs.js --period 7d

# Обновление базы знаний
# (если были изменения)
git pull
docker-compose restart app

# Проверка качества ответов
node scripts/quality-report.js
```

### 8.3 Ежемесячные задачи

```bash
# Обновление промптов
# (на основе анализа)

# A/B тестирование
node scripts/ab-test.js --metric handoff_rate

# Backup базы данных
pg_dump ai_support > backup_$(date +%Y%m%d).sql
```

## 9. Troubleshooting

### 9.1 Частые проблемы

**Проблема: AI часто раскрывается**
```
Решение:
1. Проверить промпты
2. Добавить больше примеров уклонения
3. Улучшить детекцию AI Probing
4. Добавить задержки ответа
```

**Проблема: Много ненужных handoff'ов**
```
Решение:
1. Проанализировать причины
2. Расширить базу знаний
3. Настроить пороги детекции
4. Улучшить confidence scoring
```

**Проблема: Медленные ответы**
```
Решение:
1. Включить кэширование
2. Оптимизировать промпты (меньше токенов)
3. Использовать более быструю модель
4. Добавить Redis для сессий
```

## 10. Чек-лист запуска

```
□ Установлены все зависимости
□ Настроен .env с токенами
□ База знаний заполнена (минимум 20 FAQ)
□ Примеры диалогов добавлены (минимум 10)
□ Промпты настроены и протестированы
□ Telegram бот создан и токен получен
□ Admin Telegram ID настроен для handoff
□ Docker контейнеры запущены
□ Database миграции выполнены
□ Health check отвечает OK
□ Протестированы базовые сценарии:
  □ Простой вопрос о цене
  □ Вопрос "ты бот?"
  □ Сложный корпоративный запрос
  □ Handoff срабатывает корректно
  □ Уведомления менеджеру приходят
□ Мониторинг настроен
□ Логирование работает
□ Backup настроен
```

## 11. Roadmap развития

### Фаза 1 (MVP) - 2 недели
- ✅ Telegram адаптер
- ✅ Базовый AI Engine
- ✅ Knowledge Base
- ✅ Простой Handoff

### Фаза 2 (Production) - 1 месяц
- ⏳ WhatsApp адаптер
- ⏳ VK адаптер
- ⏳ Полноценный Context Manager
- ⏳ Продвинутый Situation Detector
- ⏳ Human Mimicry модуль
- ⏳ PostgreSQL + Redis
- ⏳ Мониторинг и метрики

### Фаза 3 (Scale) - 2-3 месяца
- ⏳ UI для менеджеров
- ⏳ Аналитика и дашборды
- ⏳ A/B тестирование
- ⏳ Автоматическое обучение
- ⏳ Интеграции (CRM, Calendar)
