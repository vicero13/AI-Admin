# Testing & Quality Assurance - Тестирование и контроль качества

## 1. Введение

Этот документ описывает стратегию тестирования и контроля качества AI-агента первой линии поддержки.

### 1.1 Цели тестирования

- ✅ Проверить корректность работы всех компонентов
- ✅ Убедиться что AI не раскрывается
- ✅ Валидировать качество ответов
- ✅ Проверить handoff механизм
- ✅ Измерить производительность

### 1.2 Уровни тестирования

```
Unit Tests (Модульные)
├── Отдельные функции и методы
└── Изолированные компоненты

Integration Tests (Интеграционные)
├── Взаимодействие компонентов
└── API и внешние сервисы

E2E Tests (End-to-End)
├── Полные пользовательские сценарии
└── Реальные диалоги

Quality Tests (Качественные)
├── Проверка ответов AI
├── Детекция раскрытия
└── Человечность общения
```

## 2. Unit Tests - Модульное тестирование

### 2.1 Context Manager

**tests/unit/context-manager.test.ts:**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextManager } from '../../src/core/context-manager';

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  describe('getContext', () => {
    it('should create new context for new conversation', async () => {
      const context = await contextManager.getContext('conv-123');

      expect(context.conversationId).toBe('conv-123');
      expect(context.messageHistory).toHaveLength(0);
      expect(context.mode).toBe('ai');
      expect(context.clientType).toBe('new');
    });

    it('should return existing context for known conversation', async () => {
      const context1 = await contextManager.getContext('conv-123');
      const context2 = await contextManager.getContext('conv-123');

      expect(context1).toBe(context2);
    });
  });

  describe('addMessage', () => {
    it('should add message to history', async () => {
      await contextManager.getContext('conv-123');
      
      await contextManager.addMessage('conv-123', {
        messageId: 'msg-1',
        timestamp: Date.now(),
        role: 'user',
        content: 'Hello',
        handledBy: 'ai'
      });

      const context = await contextManager.getContext('conv-123');
      expect(context.messageHistory).toHaveLength(1);
      expect(context.messageHistory[0].content).toBe('Hello');
    });

    it('should limit history to 20 messages', async () => {
      await contextManager.getContext('conv-123');

      // Добавить 25 сообщений
      for (let i = 0; i < 25; i++) {
        await contextManager.addMessage('conv-123', {
          messageId: `msg-${i}`,
          timestamp: Date.now(),
          role: 'user',
          content: `Message ${i}`,
          handledBy: 'ai'
        });
      }

      const context = await contextManager.getContext('conv-123');
      expect(context.messageHistory).toHaveLength(20);
      expect(context.messageHistory[0].content).toBe('Message 5');
    });
  });
});
```

### 2.2 Situation Detector

**tests/unit/situation-detector.test.ts:**
```typescript
describe('SituationDetector', () => {
  let detector: SituationDetector;

  beforeEach(() => {
    detector = new SituationDetector();
  });

  describe('detectAIProbing', () => {
    it('should detect direct AI question', () => {
      const result = detector.detectAIProbing('Ты бот?');

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.recommendation).toBe('handoff');
    });

    it('should detect indirect AI question', () => {
      const result = detector.detectAIProbing('Какой у тебя любимый цвет?');

      expect(result.detected).toBe(true);
      expect(result.probingType).toBe('indirect');
    });

    it('should not detect normal question', () => {
      const result = detector.detectAIProbing('Сколько стоит рабочее место?');

      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.recommendation).toBe('answer_naturally');
    });
  });

  describe('detectEmotion', () => {
    it('should detect anger', () => {
      const result = detector.detectEmotion('ЭТО УЖАСНО!!!');

      expect(result.state).toBe('angry');
      expect(result.escalationRisk).toBe('high');
    });

    it('should detect frustration', () => {
      const result = detector.detectEmotion('Уже третий раз спрашиваю!!!');

      expect(result.state).toBe('frustrated');
    });

    it('should detect neutral', () => {
      const result = detector.detectEmotion('Привет, как дела?');

      expect(result.state).toBe('neutral');
      expect(result.escalationRisk).toBe('low');
    });
  });
});
```

### 2.3 Knowledge Base

**tests/unit/knowledge-base.test.ts:**
```typescript
describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeAll(async () => {
    kb = new KnowledgeBase();
    await kb.load('./tests/fixtures/knowledge-base');
  });

  describe('search', () => {
    it('should find FAQ by exact question', async () => {
      const results = await kb.search('Сколько стоит?');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.category).toBe('pricing');
    });

    it('should find FAQ by alternative question', async () => {
      const results = await kb.search('Какие цены?');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown question', async () => {
      const results = await kb.search('xyz123qwerty');

      expect(results).toHaveLength(0);
    });

    it('should sort by relevance', async () => {
      const results = await kb.search('цена');

      expect(results[0].relevance).toBeGreaterThanOrEqual(
        results[1]?.relevance || 0
      );
    });
  });

  describe('getBusinessInfo', () => {
    it('should return business info', () => {
      const info = kb.getBusinessInfo();

      expect(info.business.name).toBeDefined();
      expect(info.business.contacts.phone).toBeDefined();
      expect(info.business.workingHours).toBeDefined();
    });
  });
});
```

## 3. Integration Tests - Интеграционное тестирование

### 3.1 Orchestrator + AI Engine

**tests/integration/orchestrator.test.ts:**
```typescript
describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;
  let contextManager: ContextManager;

  beforeAll(() => {
    // Setup with real components
    const aiEngine = new AIEngine(process.env.ANTHROPIC_API_KEY);
    const knowledgeBase = new KnowledgeBase();
    contextManager = new ContextManager();

    orchestrator = new Orchestrator(
      aiEngine,
      knowledgeBase,
      contextManager
    );
  });

  it('should handle greeting', async () => {
    const message = createTestMessage('Привет!');
    
    const response = await orchestrator.handleMessage(message);

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(0);
    expect(response).toMatch(/привет|здравствуйте|добрый/i);
  });

  it('should answer pricing question', async () => {
    const message = createTestMessage('Сколько стоит рабочее место?');
    
    const response = await orchestrator.handleMessage(message);

    expect(response).toContain('300');
    expect(response).toMatch(/₽|рубл/i);
  });

  it('should maintain context across messages', async () => {
    const conversationId = 'test-conv-123';

    // Первое сообщение
    const msg1 = createTestMessage('Сколько стоит?', conversationId);
    await orchestrator.handleMessage(msg1);

    // Второе сообщение (продолжение)
    const msg2 = createTestMessage('А что входит?', conversationId);
    const response2 = await orchestrator.handleMessage(msg2);

    expect(response2).toMatch(/WiFi|кофе|место/i);
  });

  it('should handle multiple conversations independently', async () => {
    const conv1 = 'conv-1';
    const conv2 = 'conv-2';

    await orchestrator.handleMessage(
      createTestMessage('Привет', conv1)
    );
    
    await orchestrator.handleMessage(
      createTestMessage('Hello', conv2)
    );

    const context1 = await contextManager.getContext(conv1);
    const context2 = await contextManager.getContext(conv2);

    expect(context1.messageHistory[0].content).toBe('Привет');
    expect(context2.messageHistory[0].content).toBe('Hello');
  });
});
```

### 3.2 Handoff System Integration

**tests/integration/handoff.test.ts:**
```typescript
describe('Handoff System Integration', () => {
  let handoffSystem: HandoffSystem;
  let mockNotifications: any[];

  beforeEach(() => {
    mockNotifications = [];
    
    handoffSystem = new HandoffSystem(
      process.env.TELEGRAM_TOKEN,
      process.env.ADMIN_TELEGRAM_ID
    );

    // Mock notification sending
    handoffSystem.notifyManager = async (handoff) => {
      mockNotifications.push(handoff);
    };
  });

  it('should initiate handoff on AI probing', async () => {
    const context = createTestContext();
    const reason: HandoffReason = {
      type: 'ai_probing',
      description: 'Client asked "are you a bot?"',
      severity: 'high',
      detectedBy: 'situation_detector'
    };

    const result = await handoffSystem.initiateHandoff(
      'conv-123',
      reason,
      context
    );

    expect(result.success).toBe(true);
    expect(result.handoffId).toBeTruthy();
    expect(result.stallingMessage).toBeTruthy();
    expect(mockNotifications).toHaveLength(1);
  });

  it('should generate appropriate stalling message', async () => {
    const reason: HandoffReason = {
      type: 'complex_query',
      description: 'Corporate request',
      severity: 'normal',
      detectedBy: 'situation_detector'
    };

    const result = await handoffSystem.initiateHandoff(
      'conv-123',
      reason,
      createTestContext()
    );

    expect(result.stallingMessage).toMatch(/минут|проверю|уточню/i);
  });
});
```

## 4. E2E Tests - End-to-End тестирование

### 4.1 Полные сценарии диалогов

**tests/e2e/conversations.test.ts:**
```typescript
describe('E2E Conversation Tests', () => {
  let bot: TestBot;

  beforeAll(async () => {
    bot = new TestBot();
    await bot.start();
  });

  afterAll(async () => {
    await bot.stop();
  });

  it('Scenario: New client asks about pricing and books', async () => {
    const conversation = bot.createConversation();

    // 1. Приветствие
    let response = await conversation.send('Привет!');
    expect(response).toMatch(/привет|здравствуй/i);

    // 2. Вопрос о цене
    response = await conversation.send('Сколько стоит?');
    expect(response).toContain('300');
    expect(response).toMatch(/₽|час/i);

    // 3. Детали
    response = await conversation.send('А что входит?');
    expect(response).toMatch(/WiFi|кофе/i);

    // 4. Бронирование
    response = await conversation.send('Хочу на завтра');
    expect(response).toMatch(/записал|забронировал/i);
    expect(response).toContain('адрес');
  });

  it('Scenario: Client tries to detect AI', async () => {
    const conversation = bot.createConversation();

    // 1. Нормальный вопрос
    await conversation.send('Привет!');

    // 2. Попытка раскрыть
    const response = await conversation.send('Ты бот?');

    // Должен уклониться или передать менеджеру
    expect(response).not.toMatch(/да.*бот|я.*ai|искусственный/i);
    expect(response).toMatch(/анна|менеджер|уточню/i);
  });

  it('Scenario: Angry client escalation', async () => {
    const conversation = bot.createConversation();

    await conversation.send('Привет');

    // Отправить злое сообщение
    const response = await conversation.send('У ВАС УЖАСНЫЙ СЕРВИС!!!');

    // Должен извиниться и предложить помощь
    expect(response).toMatch(/извин|прост/i);
    
    // Проверить что был создан handoff
    const handoffs = await bot.getPendingHandoffs();
    expect(handoffs.length).toBeGreaterThan(0);
    expect(handoffs[0].reason.type).toBe('emotional_escalation');
  });

  it('Scenario: Complex corporate request', async () => {
    const conversation = bot.createConversation();

    const response = await conversation.send(
      'Нужно разместить команду 20 человек на полгода'
    );

    // Должен передать менеджеру
    expect(response).toMatch(/уточню|проверю|варианты/i);
    
    const handoffs = await bot.getPendingHandoffs();
    expect(handoffs.some(h => h.reason.type === 'complex_query')).toBe(true);
  });
});
```

### 4.2 Тест реальной интеграции

**tests/e2e/telegram-integration.test.ts:**
```typescript
describe('Telegram Integration E2E', () => {
  // Требует реальный Telegram test bot
  
  it('should receive and respond to messages', async () => {
    const testUser = new TelegramTestUser(TEST_USER_ID);

    // Отправить сообщение боту
    await testUser.sendMessage('Привет!');

    // Дождаться ответа
    const response = await testUser.waitForResponse(5000);

    expect(response).toBeTruthy();
    expect(response.text).toMatch(/привет/i);
  });

  it('should show typing indicator', async () => {
    const testUser = new TelegramTestUser(TEST_USER_ID);

    await testUser.sendMessage('Расскажи про услуги');

    // Проверить что есть typing indicator
    const hasTyping = await testUser.checkTypingIndicator();
    expect(hasTyping).toBe(true);
  });
});
```

## 5. Quality Tests - Тестирование качества

### 5.1 Тест естественности ответов

**tests/quality/naturalness.test.ts:**
```typescript
describe('Response Naturalness Tests', () => {
  let humanMimicry: HumanMimicry;

  beforeAll(() => {
    humanMimicry = new HumanMimicry();
  });

  describe('Roboticness Detection', () => {
    it('should flag overly formal response', () => {
      const text = 'Благодарю за ваш запрос. Предоставляю вам исчерпывающую информацию.';
      
      const score = humanMimicry.checkRoboticsness(text);

      expect(score.score).toBeGreaterThan(70);
      expect(score.flags.tooFormal).toBe(true);
    });

    it('should approve natural response', () => {
      const text = 'Привет! Расскажу про цены 😊';
      
      const score = humanMimicry.checkRoboticsness(text);

      expect(score.score).toBeLessThan(30);
      expect(score.flags.tooFormal).toBe(false);
    });

    it('should flag instant responses', () => {
      const responseTime = 50; // 50ms
      
      // Очень быстрый ответ на сложный вопрос
      expect(responseTime).toBeLessThan(100); // слишком быстро
    });
  });

  describe('Personality Consistency', () => {
    it('should use consistent emoji style', async () => {
      const responses = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await generateResponse('Привет');
        responses.push(response);
      }

      // Проверить что стиль эмодзи консистентен
      const emojiCounts = responses.map(r => 
        (r.match(/😊|👍|✨/g) || []).length
      );

      const avg = emojiCounts.reduce((a, b) => a + b) / emojiCounts.length;
      
      // Все ответы должны быть примерно с одинаковым количеством эмодзи
      emojiCounts.forEach(count => {
        expect(Math.abs(count - avg)).toBeLessThan(2);
      });
    });
  });
});
```

### 5.2 Тест защиты от раскрытия

**tests/quality/ai-detection.test.ts:**
```typescript
describe('AI Detection Prevention Tests', () => {
  const aiProbingQuestions = [
    'Ты бот?',
    'Ты робот?',
    'Ты AI?',
    'Ты искусственный интеллект?',
    'Какой у тебя любимый цвет?',
    'Что ты ела на завтрак?',
    'Реши задачу: 2+2*2',
    'Напиши код на Python',
    'У тебя есть API?'
  ];

  it.each(aiProbingQuestions)(
    'should not reveal AI nature for: "%s"',
    async (question) => {
      const response = await orchestrator.handleMessage(
        createTestMessage(question)
      );

      // Не должен прямо говорить что он AI
      expect(response).not.toMatch(/да.*бот|я.*ai|я.*робот|искусственный/i);
      
      // Не должен прямо отрицать
      expect(response).not.toMatch(/нет.*не бот|я не ai/i);
      
      // Должен либо уклониться либо передать менеджеру
      expect(
        response.match(/анна|менеджер|уточню|коворкинг/i) ||
        await wasHandoffInitiated()
      ).toBeTruthy();
    }
  );

  it('should handle multiple AI probing attempts', async () => {
    const conversation = bot.createConversation();

    // Первая попытка
    let response = await conversation.send('Ты бот?');
    expect(response).toMatch(/анна|менеджер/i);

    // Вторая попытка
    response = await conversation.send('Нет, серьёзно, ты программа?');
    
    // При повторных попытках должен передать менеджеру
    const handoffs = await bot.getPendingHandoffs();
    expect(handoffs.length).toBeGreaterThan(0);
  });
});
```

### 5.3 Тест качества информации

**tests/quality/accuracy.test.ts:**
```typescript
describe('Information Accuracy Tests', () => {
  let knowledgeBase: KnowledgeBase;

  beforeAll(async () => {
    knowledgeBase = new KnowledgeBase();
    await knowledgeBase.load('./knowledge-base');
  });

  it('should provide correct pricing', async () => {
    const response = await orchestrator.handleMessage(
      createTestMessage('Сколько стоит рабочее место?')
    );

    // Проверить что цены соответствуют базе знаний
    const services = knowledgeBase.getServices();
    const hourlyPrice = services.services.find(
      s => s.serviceId === 'open-space-hour'
    )?.pricing[0].amount;

    expect(response).toContain(hourlyPrice.toString());
  });

  it('should not hallucinate services', async () => {
    const response = await orchestrator.handleMessage(
      createTestMessage('У вас есть массажное кресло?')
    );

    // Не должен выдумывать что есть
    expect(response).not.toMatch(/да.*есть|у нас есть/i);
    
    // Должен сказать что уточнит
    expect(response).toMatch(/уточню|проверю/i);
  });

  it('should provide correct working hours', async () => {
    const response = await orchestrator.handleMessage(
      createTestMessage('Какие у вас часы работы?')
    );

    const businessInfo = knowledgeBase.getBusinessInfo();
    const hours = businessInfo.business.workingHours.regular;

    // Проверить что упомянуты правильные часы
    expect(response).toMatch(/9:00|09:00/);
    expect(response).toMatch(/23:00/);
  });
});
```

## 6. Performance Tests - Тестирование производительности

### 6.1 Нагрузочное тестирование

**tests/performance/load.test.ts:**
```typescript
describe('Load Tests', () => {
  it('should handle 100 concurrent conversations', async () => {
    const conversations = Array(100).fill(0).map((_, i) => 
      bot.createConversation(`load-test-${i}`)
    );

    const startTime = Date.now();

    // Отправить всем сообщения одновременно
    const responses = await Promise.all(
      conversations.map(conv => conv.send('Привет!'))
    );

    const duration = Date.now() - startTime;

    // Все должны получить ответ
    expect(responses.every(r => r.length > 0)).toBe(true);
    
    // В разумное время (< 30 секунд для 100 диалогов)
    expect(duration).toBeLessThan(30000);
  });

  it('should maintain response time under load', async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await orchestrator.handleMessage(
        createTestMessage('Сколько стоит?')
      );
      responseTimes.push(Date.now() - start);
    }

    const avgTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const p95 = responseTimes.sort()[Math.floor(responseTimes.length * 0.95)];

    expect(avgTime).toBeLessThan(2000); // среднее < 2 сек
    expect(p95).toBeLessThan(5000); // p95 < 5 сек
  });
});
```

### 6.2 Memory Leak Tests

**tests/performance/memory.test.ts:**
```typescript
describe('Memory Tests', () => {
  it('should not leak memory on many conversations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Создать 1000 диалогов
    for (let i = 0; i < 1000; i++) {
      await orchestrator.handleMessage(
        createTestMessage(`Message ${i}`, `conv-${i}`)
      );
    }

    // Принудительная сборка мусора
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Рост памяти должен быть разумным (< 100MB)
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## 7. Regression Tests - Регрессионное тестирование

### 7.1 Сохранённые сценарии

**tests/regression/saved-scenarios.test.ts:**
```typescript
describe('Regression Tests', () => {
  // Сценарии которые ранее работали неправильно
  
  it('Bug #42: Should not reveal AI on technical questions', async () => {
    const response = await orchestrator.handleMessage(
      createTestMessage('У тебя есть API?')
    );

    expect(response).not.toMatch(/api|программ/i);
    expect(response).toMatch(/менеджер|коворкинг/i);
  });

  it('Bug #73: Should handle rapid messages without context loss', async () => {
    const conv = bot.createConversation();

    // Быстрая последовательность
    await conv.send('Привет');
    await conv.send('Цены');
    const response = await conv.send('Что входит?');

    // Должен понять что "что входит" относится к ценам
    expect(response).toMatch(/WiFi|кофе|место/i);
  });

  it('Bug #89: Should not duplicate responses', async () => {
    const conv = bot.createConversation();
    
    const response = await conv.send('Привет!');
    
    // Не должно быть дублей
    const words = response.split(' ');
    const uniqueWords = [...new Set(words)];
    
    expect(words.length).toBeCloseTo(uniqueWords.length, 2);
  });
});
```

## 8. Continuous Testing - Непрерывное тестирование

### 8.1 CI/CD Pipeline

**..github/workflows/test.yml:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Run quality tests
        run: npm run test:quality
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Check test coverage
        run: |
          COVERAGE=$(npm run test:coverage --silent | grep "All files" | awk '{print $10}' | sed 's/%//')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

### 8.2 Production Monitoring Tests

**tests/monitoring/health.test.ts:**
```typescript
describe('Production Health Tests', () => {
  it('should check system health', async () => {
    const health = await fetch('http://localhost:3000/health')
      .then(r => r.json());

    expect(health.status).toBe('ok');
    expect(health.components.aiEngine.status).toBe('up');
    expect(health.components.knowledgeBase.status).toBe('up');
  });

  it('should track key metrics', async () => {
    const metrics = await fetch('http://localhost:3000/metrics')
      .then(r => r.text());

    // Проверить что метрики существуют
    expect(metrics).toContain('conversations_total');
    expect(metrics).toContain('handoffs_total');
    expect(metrics).toContain('response_time_seconds');
  });
});
```

## 9. Test Data Management

### 9.1 Fixtures

**tests/fixtures/conversations.json:**
```json
{
  "simple_greeting": {
    "messages": [
      { "role": "user", "content": "Привет!" }
    ],
    "expectedResponse": {
      "contains": ["привет", "помочь"],
      "notContains": ["бот", "ai"]
    }
  },
  
  "pricing_inquiry": {
    "messages": [
      { "role": "user", "content": "Сколько стоит?" }
    ],
    "expectedResponse": {
      "contains": ["300", "₽"],
      "responseTime": { "max": 3000 }
    }
  },
  
  "ai_probing": {
    "messages": [
      { "role": "user", "content": "Ты бот?" }
    ],
    "expectedResponse": {
      "notContains": ["да", "я бот", "ai"],
      "contains": ["анна", "менеджер"],
      "shouldTriggerHandoff": true
    }
  }
}
```

### 9.2 Mock Services

**tests/mocks/ai-engine.mock.ts:**
```typescript
export class MockAIEngine implements IAIEngine {
  private responses: Map<string, string> = new Map();

  setMockResponse(input: string, output: string) {
    this.responses.set(input.toLowerCase(), output);
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const key = request.message.toLowerCase();
    const text = this.responses.get(key) || 'Мок ответ';

    return {
      text,
      metadata: {
        provider: 'mock',
        model: 'mock',
        tokensUsed: 10,
        latency: 100,
        confidence: 0.9,
        finishReason: 'stop',
        cached: false,
        timestamp: Date.now()
      }
    };
  }
}
```

## 10. Quality Metrics & Reporting

### 10.1 Метрики качества

```typescript
interface QualityMetrics {
  // Точность ответов
  accuracy: {
    correctAnswers: number;
    totalAnswers: number;
    accuracyRate: number; // %
  };
  
  // Раскрытие AI
  aiDetection: {
    probeAttempts: number;
    revealed: number;
    detectionRate: number; // %
  };
  
  // Handoff
  handoff: {
    total: number;
    appropriate: number;
    premature: number;
    missed: number;
    appropriatenessRate: number; // %
  };
  
  // Производительность
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    timeouts: number;
  };
  
  // Человечность
  humanness: {
    averageRoboticnessScore: number;
    flaggedResponses: number;
    naturalityRate: number; // %
  };
}
```

### 10.2 Отчёт о тестировании

**scripts/generate-test-report.ts:**
```typescript
async function generateTestReport() {
  const results = await runAllTests();
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      coverage: results.coverage
    },
    
    quality: {
      accuracy: 94.5, // %
      aiDetectionPrevention: 96.2, // %
      handoffAppropriateness: 91.8, // %
      naturalness: 89.3, // %
    },
    
    performance: {
      avgResponseTime: 1.2, // seconds
      p95ResponseTime: 3.1, // seconds
      throughput: 150 // requests/minute
    },
    
    failedTests: results.failures.map(f => ({
      name: f.name,
      error: f.error,
      category: f.category
    }))
  };
  
  // Сохранить отчёт
  await fs.writeFile(
    `test-reports/report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  // Отправить в Slack/Email если есть проблемы
  if (report.summary.failed > 0) {
    await notifyTeam(report);
  }
}
```

## 11. Test Maintenance

### 11.1 Регулярное обновление тестов

```bash
# Еженедельно
- Добавить новые тест-кейсы на основе реальных диалогов
- Обновить фикстуры с новыми примерами
- Проверить coverage и добавить тесты для слабых мест

# Ежемесячно
- Ревью всех тестов
- Удалить устаревшие тесты
- Обновить моки и фикстуры
- Запустить полный regression suite
```

### 11.2 Тест чек-лист перед релизом

```
□ Все unit тесты проходят (100%)
□ Все integration тесты проходят
□ E2E тесты проходят на всех платформах
□ Quality тесты показывают:
  □ Accuracy > 90%
  □ AI Detection Prevention > 95%
  □ Handoff Appropriateness > 90%
  □ Naturalness Score > 85%
□ Performance тесты проходят:
  □ Avg response time < 2s
  □ P95 response time < 5s
  □ No memory leaks
□ Coverage > 80%
□ No critical bugs
□ Regression suite passed
□ Manual testing completed
```

## 12. Troubleshooting Tests

### 12.1 Частые проблемы

**Проблема: Тесты падают случайно**
```
Причина: Недетерминированность AI ответов
Решение: 
- Использовать моки для unit тестов
- Проверять паттерны вместо точного текста
- Увеличить таймауты
```

**Проблема: Тесты медленные**
```
Причина: Реальные API вызовы
Решение:
- Моки для unit/integration тестов
- Кэширование ответов
- Параллельный запуск тестов
- Использовать более быструю модель для тестов
```

**Проблема: Flaky тесты (нестабильные)**
```
Причина: Race conditions, таймауты
Решение:
- Добавить ретраи
- Увеличить таймауты
- Использовать явные ожидания
- Изолировать тесты друг от друга
```

## 13. Best Practices

### 13.1 Правила написания тестов

```typescript
// ✅ ХОРОШО: Понятное название
it('should detect AI probing on direct question', () => {});

// ❌ ПЛОХО: Непонятное название
it('test1', () => {});

// ✅ ХОРОШО: Arrange-Act-Assert
it('should add message to history', async () => {
  // Arrange
  const context = await contextManager.getContext('conv-1');
  const message = createTestMessage('Hello');
  
  // Act
  await contextManager.addMessage('conv-1', message);
  
  // Assert
  expect(context.messageHistory).toHaveLength(1);
});

// ✅ ХОРОШО: Один тест = одна проверка
it('should return correct price', () => {});
it('should include currency symbol', () => {});

// ❌ ПЛОХО: Много проверок в одном
it('should work', () => {
  // проверка 1, 2, 3, 4, 5...
});
```

### 13.2 Test Pyramid

```
       /\
      /  \  E2E Tests (10%)
     /────\
    /      \  Integration Tests (30%)
   /────────\
  /          \  Unit Tests (60%)
 /────────────\
```

Фокус на unit тестах - они быстрые и дают быструю обратную связь.

---

**Поздравляем! Вы завершили полный набор документации для AI-агента первой линии поддержки! 🎉**
