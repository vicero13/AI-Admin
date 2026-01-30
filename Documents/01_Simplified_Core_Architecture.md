# Simplified Core Architecture - AI-агент первой линии поддержки

## 1. Введение

Данный документ описывает упрощённую архитектуру AI-агента, задача которого - **имитировать живого менеджера** на первой линии общения с клиентами.

### 1.1 Ключевые отличия от полной версии

Этот AI-агент **НЕ выполняет** автоматические действия (бронирование, оплата, интеграции).

Его задача:
- ✅ Общаться как живой человек
- ✅ Отвечать на типовые вопросы
- ✅ Не раскрывать, что он AI
- ✅ Передавать сложные ситуации живому менеджеру

### 1.2 Основная цель

**Снизить нагрузку на менеджеров**, отвечая на 70-80% типовых вопросов, при этом оставаясь незамеченным как AI.

## 2. Архитектурные принципы

### 2.1 Принцип человечности
AI должен имитировать естественное общение живого менеджера:
- Использовать разговорный язык
- Допускать лёгкую небрежность (как реальные люди)
- Реагировать эмоционально уместно
- Избегать роботических фраз

### 2.2 Принцип безопасной передачи
При малейшем сомнении - лучше передать живому человеку, чем дать неверный ответ.

### 2.3 Принцип контекстуальности
AI должен помнить:
- Кто клиент (новый/постоянный)
- Историю общения
- Предыдущие вопросы в текущей сессии

### 2.4 Принцип модульности
Возможность в будущем подключить интеграции (CRM, платежи и т.д.) как отдельные модули.

## 3. Упрощённая слоистая архитектура

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Telegram │  │ WhatsApp │  │   VK     │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│         MESSAGING ABSTRACTION LAYER                     │
│         (Унификация сообщений)                          │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│            ORCHESTRATION LAYER                          │
│  ┌────────────────────────────────────────────┐        │
│  │      Message Router & Controller           │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│              INTELLIGENCE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐      │
│  │   Context    │  │  Situation   │  │  Human  │      │
│  │   Manager    │  │  Detector    │  │ Mimicry │      │
│  └──────────────┘  └──────────────┘  └─────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│              AI ENGINE LAYER                            │
│  ┌──────────────────────────────────────────┐          │
│  │  Claude / GPT / Other AI Provider        │          │
│  │  + Prompt Engineering                    │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│          KNOWLEDGE BASE LAYER (ПНД)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐      │
│  │   Business   │  │   Dialog     │  │ Client  │      │
│  │   Info       │  │   Dataset    │  │  Data   │      │
│  └──────────────┘  └──────────────┘  └─────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│            HANDOFF LAYER                                │
│  ┌────────────────────────────────────────────┐        │
│  │  Human Manager Notification & Transfer     │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│              DATA LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Conversation│ Client  │  │   Logs   │             │
│  │  History  │  │ Profiles │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

## 4. Ключевые компоненты (упрощённая версия)

### 4.1 Presentation Layer (Адаптеры мессенджеров)
**Без изменений** - используем из полной архитектуры.

**Задача**: Получение и отправка сообщений через различные платформы.

**Интерфейс**: `IMessengerAdapter` (как в полной версии)

### 4.2 Messaging Abstraction Layer
**Без изменений** - используем из полной архитектуры.

**Задача**: Унификация всех типов сообщений.

**Формат**: `UniversalMessage` (как в полной версии)

### 4.3 Orchestration Layer (Упрощённый оркестратор)
**Упрощённая версия** - убираем сложную бизнес-логику.

**Задача**: 
- Маршрутизация сообщений
- Управление сессиями
- Координация между AI и живым менеджером

**Основные функции**:
```typescript
interface ISimplifiedOrchestrator {
  // Обработка сообщений
  handleIncomingMessage(message: UniversalMessage): Promise<void>;
  
  // Определение режима
  isHumanMode(conversationId: string): Promise<boolean>;
  switchToHumanMode(conversationId: string, reason: string): Promise<void>;
  switchToAIMode(conversationId: string): Promise<void>;
  
  // Управление сессиями
  getSession(conversationId: string): Promise<Session>;
  updateSession(session: Session): Promise<void>;
}
```

### 4.4 Intelligence Layer (Слой интеллекта)

#### 4.4.1 Context Manager
**Задача**: Управление контекстом разговора и информацией о клиенте.

**Что хранит**:
- История текущего диалога
- Тип клиента (новый/постоянный/VIP)
- Предыдущие обращения
- Предпочтения клиента
- Эмоциональное состояние

```typescript
interface IContextManager {
  // Контекст
  getContext(conversationId: string): Promise<ConversationContext>;
  updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<void>;
  
  // История
  addMessage(conversationId: string, message: Message): Promise<void>;
  getHistory(conversationId: string, limit?: number): Promise<Message[]>;
  
  // Клиент
  identifyClient(userId: string, platform: PlatformType): Promise<ClientProfile>;
  updateClientProfile(userId: string, updates: Partial<ClientProfile>): Promise<void>;
}

interface ConversationContext {
  conversationId: string;
  userId: string;
  
  // Текущая сессия
  sessionStarted: Timestamp;
  lastActivity: Timestamp;
  
  // Клиент
  clientType: "new" | "returning" | "vip" | "problematic";
  clientProfile?: ClientProfile;
  
  // История
  messageHistory: Message[];
  
  // Состояние
  currentTopic?: string;
  emotionalState: "neutral" | "positive" | "frustrated" | "angry";
  
  // Флаги
  suspectAI: boolean; // клиент подозревает, что общается с AI
  complexQuery: boolean; // запрос слишком сложный
  
  // Метаданные
  metadata?: Record<string, any>;
}

interface ClientProfile {
  userId: string;
  platform: PlatformType;
  
  // Базовая информация
  name?: string;
  phoneNumber?: string;
  
  // Статистика
  firstContact: Timestamp;
  lastContact: Timestamp;
  totalConversations: number;
  
  // Тип
  type: "new" | "returning" | "vip" | "problematic";
  
  // Предпочтения
  preferredLanguage?: string;
  communicationStyle?: "formal" | "casual";
  
  // Теги
  tags: string[];
  
  // Заметки
  notes?: string;
  
  // История взаимодействий
  previousTopics: string[];
  
  metadata?: Record<string, any>;
}
```

#### 4.4.2 Situation Detector
**Задача**: Определить, когда AI должен передать диалог живому человеку.

**Что детектирует**:
1. **AI Probing** - попытки раскрыть, что собеседник - AI
2. **Complex Queries** - вопросы вне компетенции
3. **Emotional Escalation** - клиент злится/расстроен
4. **Confidence Level** - AI не уверен в ответе
5. **Special Requests** - нестандартные запросы
6. **Contradictions** - информация противоречит базе знаний

```typescript
interface ISituationDetector {
  // Анализ ситуации
  analyze(message: UniversalMessage, context: ConversationContext): Promise<SituationAnalysis>;
  
  // Специфичные детекторы
  detectAIProbing(message: string): Promise<AIProbeDetection>;
  detectComplexQuery(message: string, knowledgeBase: any): Promise<ComplexityScore>;
  detectEmotionalState(message: string, history: Message[]): Promise<EmotionalState>;
  assessConfidence(aiResponse: string, query: string): Promise<ConfidenceScore>;
  
  // Решение о передаче
  shouldHandoff(analysis: SituationAnalysis): boolean;
  getHandoffReason(analysis: SituationAnalysis): string;
}

interface SituationAnalysis {
  timestamp: Timestamp;
  
  // Детекции
  aiProbingDetected: boolean;
  aiProbingConfidence: number;
  
  complexQuery: boolean;
  complexityScore: number;
  
  emotionalState: EmotionalState;
  
  aiConfidence: number;
  
  // Решение
  requiresHandoff: boolean;
  handoffReason?: string;
  urgency: "low" | "medium" | "high";
  
  // Дополнительно
  detectedIntents: string[];
  missingInformation: string[];
  
  metadata?: Record<string, any>;
}

interface AIProbeDetection {
  detected: boolean;
  confidence: number;
  indicators: string[]; // ["asked about being AI", "question about favorite color"]
  probingType: "direct" | "indirect" | "technical";
}

interface ComplexityScore {
  score: number; // 0-100
  factors: {
    outOfScope: boolean;
    requiresCalculation: boolean;
    needsExternalData: boolean;
    ambiguous: boolean;
    multiStep: boolean;
  };
  recommendation: "answer" | "handoff" | "clarify";
}

interface EmotionalState {
  state: "positive" | "neutral" | "frustrated" | "angry";
  confidence: number;
  indicators: string[];
  changeFromPrevious?: "escalated" | "stable" | "improved";
}

interface ConfidenceScore {
  score: number; // 0-100
  factors: {
    knowledgeBaseMatch: number;
    responseClarity: number;
    potentialHallucination: number;
  };
  recommendation: "send" | "review" | "handoff";
}
```

#### 4.4.3 Human Mimicry Module
**Задача**: Обеспечить максимально естественное, человеческое общение.

**Что делает**:
1. **Style Adaptation** - подстраивается под стиль клиента
2. **Natural Language** - использует разговорный язык
3. **Personality Injection** - добавляет индивидуальность
4. **Timing Simulation** - имитирует время набора текста
5. **Error Injection** - иногда допускает опечатки (легкие)
6. **Emotion Expression** - выражает эмоции уместно

```typescript
interface IHumanMimicry {
  // Адаптация стиля
  adaptStyle(message: string, clientStyle: string): Promise<string>;
  
  // Натуральность
  makeNatural(text: string): Promise<string>;
  
  // Личность
  injectPersonality(text: string, personality: PersonalityProfile): Promise<string>;
  
  // Тайминг
  calculateTypingDelay(text: string): number;
  simulateTyping(conversationId: string, duration: number): Promise<void>;
  
  // "Человечность"
  addHumanTouch(text: string, options?: HumanTouchOptions): Promise<string>;
  
  // Проверка
  checkForRobotic(text: string): RoboticnessScore;
}

interface PersonalityProfile {
  name: string;
  style: "professional" | "friendly" | "casual" | "formal";
  traits: {
    emoji_usage: "none" | "rare" | "moderate" | "frequent";
    punctuation: "formal" | "casual";
    vocabulary: "simple" | "moderate" | "advanced";
    humor: boolean;
    empathy: "low" | "medium" | "high";
  };
  
  // Паттерны речи
  greetings: string[];
  farewells: string[];
  acknowledgments: string[];
  delays: string[]; // "Минуточку...", "Сейчас посмотрю..."
  
  // Ограничения
  avoid_words: string[]; // слова, которые выдают AI
  preferred_phrases: string[];
}

interface HumanTouchOptions {
  add_thinking_pause?: boolean; // "Хмм, дайте подумаю..."
  add_typo?: boolean; // легкая опечатка (редко)
  add_emoji?: boolean;
  add_colloquialism?: boolean; // разговорные выражения
  vary_response_time?: boolean;
}

interface RoboticnessScore {
  score: number; // 0-100, где 100 = очень роботично
  flags: {
    too_formal: boolean;
    too_perfect: boolean;
    repetitive_structure: boolean;
    unnatural_phrasing: boolean;
    instant_response: boolean;
  };
  suggestions: string[];
}
```

### 4.5 AI Engine Layer

**Упрощённая версия** - фокус на качестве общения, а не на действиях.

```typescript
interface ISimplifiedAIEngine {
  // Генерация ответа
  generateResponse(request: AIRequest): Promise<AIResponse>;
  
  // Специфичные для имитации человека
  generateHumanLikeResponse(
    message: string,
    context: ConversationContext,
    knowledgeBase: KnowledgeBase,
    personality: PersonalityProfile
  ): Promise<HumanLikeResponse>;
  
  // Проверка
  validateResponse(response: string, context: ConversationContext): Promise<ValidationResult>;
}

interface AIRequest {
  // Входные данные
  message: string;
  context: ConversationContext;
  
  // База знаний
  knowledgeBase: KnowledgeBase;
  
  // Параметры
  personality: PersonalityProfile;
  maxLength?: number;
  temperature?: number;
  
  // Инструкции
  systemPrompt: string;
  
  metadata?: Record<string, any>;
}

interface HumanLikeResponse {
  // Ответ
  text: string;
  
  // Метаданные
  confidence: number;
  requiresHandoff: boolean;
  handoffReason?: string;
  
  // Тайминг
  typingDelay: number;
  
  // Дополнительно
  suggestedFollowUp?: string[];
  detectedIntent?: string;
  usedKnowledge: string[]; // какие части базы знаний использовались
  
  metadata?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  recommendation: "send" | "regenerate" | "handoff";
}

interface ValidationIssue {
  type: "too_robotic" | "incorrect_info" | "inappropriate" | "off_topic";
  severity: "low" | "medium" | "high";
  description: string;
}
```

### 4.6 Knowledge Base Layer (ПНД - Персонализированные Данные)

**Самый важный слой для этого проекта!**

**Задача**: Хранить всю информацию о бизнесе, которую AI должен знать.

```typescript
interface IKnowledgeBase {
  // Поиск информации
  search(query: string): Promise<KnowledgeSearchResult[]>;
  findRelevant(query: string, limit?: number): Promise<KnowledgeItem[]>;
  
  // Получение информации
  getByCategory(category: string): Promise<KnowledgeItem[]>;
  getByTags(tags: string[]): Promise<KnowledgeItem[]>;
  
  // Управление
  addKnowledge(item: KnowledgeItem): Promise<void>;
  updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<void>;
  deleteKnowledge(id: string): Promise<void>;
  
  // Проверка
  hasInformation(query: string): Promise<boolean>;
  getConfidence(query: string): Promise<number>;
}

interface KnowledgeBase {
  // Информация о бизнесе
  businessInfo: BusinessInfo;
  
  // Услуги и продукты
  services: Service[];
  
  // FAQ
  faq: FAQItem[];
  
  // Политики
  policies: Policy[];
  
  // Примеры диалогов (dataset)
  dialogExamples: DialogExample[];
  
  // Стоп-слова и фразы
  restrictedTopics: string[];
  
  metadata?: Record<string, any>;
}

interface BusinessInfo {
  // Основное
  name: string;
  type: string; // "coworking", "salon", "fitness", etc.
  description: string;
  
  // Контакты
  address: string;
  phone: string;
  email: string;
  website?: string;
  
  // Режим работы
  workingHours: {
    [day: string]: { open: string; close: string };
  };
  holidays: Date[];
  
  // Особенности
  amenities: string[]; // удобства
  rules: string[];
  
  // Команда
  team: TeamMember[];
  
  metadata?: Record<string, any>;
}

interface Service {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  
  // Цены
  pricing: {
    amount: number;
    currency: string;
    unit?: string; // "per hour", "per month"
    conditions?: string;
  }[];
  
  // Доступность
  available: boolean;
  availabilityConditions?: string;
  
  // Популярность
  popular: boolean;
  
  // Дополнительно
  features: string[];
  images?: string[];
  
  tags: string[];
  metadata?: Record<string, any>;
}

interface FAQItem {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  
  // Варианты вопроса
  alternativeQuestions: string[];
  
  // Связанные вопросы
  relatedQuestions: string[];
  
  // Популярность
  popularity: number;
  
  tags: string[];
  metadata?: Record<string, any>;
}

interface Policy {
  policyId: string;
  name: string;
  type: "cancellation" | "refund" | "privacy" | "terms" | "other";
  content: string;
  
  // Краткая версия
  summary: string;
  
  // Ключевые моменты
  keyPoints: string[];
  
  lastUpdated: Timestamp;
  metadata?: Record<string, any>;
}

interface DialogExample {
  exampleId: string;
  
  // Диалог
  messages: DialogMessage[];
  
  // Контекст
  situation: string; // "новый клиент спрашивает о ценах"
  clientType: "new" | "returning" | "vip";
  
  // Результат
  outcome: "successful" | "escalated" | "negative";
  
  // Оценка
  quality: number; // 1-5
  
  // Что можно извлечь
  learnings: string[];
  
  tags: string[];
  metadata?: Record<string, any>;
}

interface DialogMessage {
  role: "client" | "manager";
  text: string;
  timestamp?: Timestamp;
  
  // Анализ
  intent?: string;
  emotion?: string;
  
  metadata?: Record<string, any>;
}

interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  specialization?: string[];
}

interface KnowledgeSearchResult {
  item: KnowledgeItem;
  relevance: number; // 0-1
  matchedTerms: string[];
}

interface KnowledgeItem {
  id: string;
  type: "service" | "faq" | "policy" | "dialog" | "other";
  content: any;
  category: string;
  tags: string[];
  relevance?: number;
}
```

### 4.7 Handoff Layer (Передача менеджеру)

**Критически важный слой для этого проекта!**

```typescript
interface IHandoffSystem {
  // Передача
  initiateHandoff(
    conversationId: string,
    reason: HandoffReason,
    context: ConversationContext
  ): Promise<HandoffResult>;
  
  // Уведомление менеджера
  notifyManager(handoff: Handoff): Promise<void>;
  
  // Управление состоянием
  setHumanMode(conversationId: string): Promise<void>;
  setAIMode(conversationId: string): Promise<void>;
  isHumanMode(conversationId: string): Promise<boolean>;
  
  // Информация для менеджера
  prepareHandoffPackage(conversationId: string): Promise<HandoffPackage>;
  
  // Статистика
  getHandoffStats(period?: DateRange): Promise<HandoffStats>;
}

interface HandoffReason {
  type: "ai_probing" | "complex_query" | "emotional_escalation" | 
        "low_confidence" | "special_request" | "other";
  description: string;
  severity: "low" | "medium" | "high" | "urgent";
  detectedBy: string; // компонент, который инициировал
}

interface Handoff {
  handoffId: UUID;
  conversationId: string;
  userId: string;
  
  // Причина
  reason: HandoffReason;
  
  // Контекст
  context: ConversationContext;
  
  // Временные метки
  initiatedAt: Timestamp;
  acceptedAt?: Timestamp;
  resolvedAt?: Timestamp;
  
  // Назначение
  assignedTo?: string; // manager ID
  
  // Статус
  status: "pending" | "accepted" | "in_progress" | "resolved";
  
  // Результат
  resolution?: string;
  returnedToAI: boolean;
  
  metadata?: Record<string, any>;
}

interface HandoffResult {
  success: boolean;
  handoffId: string;
  message: string; // сообщение для показа клиенту
  estimatedWaitTime?: number; // seconds
}

interface HandoffPackage {
  // Основное
  handoff: Handoff;
  
  // Клиент
  client: ClientProfile;
  
  // История диалога
  conversationHistory: Message[];
  
  // Контекст
  context: ConversationContext;
  
  // Анализ ситуации
  situationAnalysis: SituationAnalysis;
  
  // Рекомендации для менеджера
  suggestions: string[];
  
  // Важная информация
  urgentNotes?: string[];
  
  // База знаний (релевантная)
  relevantKnowledge: KnowledgeItem[];
}

interface HandoffStats {
  period: DateRange;
  
  // Общее
  total: number;
  byReason: Record<string, number>;
  bySeverity: Record<string, number>;
  
  // Тайминг
  averageResponseTime: number;
  averageResolutionTime: number;
  
  // Результаты
  resolvedByManager: number;
  returnedToAI: number;
  
  // Тренды
  trend: "increasing" | "stable" | "decreasing";
}

interface Message {
  messageId: string;
  conversationId: string;
  
  role: "user" | "assistant" | "manager" | "system";
  content: string;
  
  timestamp: Timestamp;
  
  // Метаданные
  intent?: string;
  emotion?: string;
  handledBy?: "ai" | "human";
  
  metadata?: Record<string, any>;
}
```

### 4.8 Data Layer (Упрощённый)

**Минимально необходимое хранилище.**

```typescript
interface ISimplifiedDataLayer {
  // Диалоги
  conversations: IConversationRepository;
  
  // Клиенты
  clients: IClientRepository;
  
  // База знаний
  knowledge: IKnowledgeRepository;
  
  // Логи
  logs: ILogRepository;
  
  // Передачи
  handoffs: IHandoffRepository;
}

interface IConversationRepository {
  create(conversation: Conversation): Promise<void>;
  get(conversationId: string): Promise<Conversation>;
  update(conversationId: string, updates: Partial<Conversation>): Promise<void>;
  
  addMessage(conversationId: string, message: Message): Promise<void>;
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  
  findActive(userId: string): Promise<Conversation | null>;
  findByUser(userId: string): Promise<Conversation[]>;
}

interface IClientRepository {
  create(client: ClientProfile): Promise<void>;
  get(userId: string, platform: PlatformType): Promise<ClientProfile>;
  update(userId: string, updates: Partial<ClientProfile>): Promise<void>;
  
  addNote(userId: string, note: string): Promise<void>;
  addTag(userId: string, tag: string): Promise<void>;
  removeTag(userId: string, tag: string): Promise<void>;
}

interface IKnowledgeRepository {
  search(query: string): Promise<KnowledgeItem[]>;
  getByCategory(category: string): Promise<KnowledgeItem[]>;
  getByTags(tags: string[]): Promise<KnowledgeItem[]>;
  
  add(item: KnowledgeItem): Promise<void>;
  update(id: string, updates: Partial<KnowledgeItem>): Promise<void>;
  delete(id: string): Promise<void>;
}

interface ILogRepository {
  log(entry: LogEntry): Promise<void>;
  query(filter: LogFilter): Promise<LogEntry[]>;
  
  // Специфичные методы
  logHandoff(handoff: Handoff): Promise<void>;
  logAIProbing(detection: AIProbeDetection, context: any): Promise<void>;
}

interface IHandoffRepository {
  create(handoff: Handoff): Promise<void>;
  get(handoffId: string): Promise<Handoff>;
  update(handoffId: string, updates: Partial<Handoff>): Promise<void>;
  
  findPending(): Promise<Handoff[]>;
  findByManager(managerId: string): Promise<Handoff[]>;
  
  getStats(period?: DateRange): Promise<HandoffStats>;
}
```

## 5. Потоки данных (упрощённые сценарии)

### 5.1 Успешный диалог (AI справился)

```
1. Клиент пишет → Telegram Adapter
2. Adapter → UniversalMessage
3. Orchestrator получает сообщение
4. Orchestrator → Context Manager: загрузить контекст
5. Context Manager → определяет: новый клиент
6. Orchestrator → AI Engine: сгенерировать ответ
7. AI Engine:
   - Проверяет Knowledge Base
   - Применяет Personality
   - Использует Dialog Examples
   - Генерирует ответ
8. AI Engine → Situation Detector: проверить ответ
9. Situation Detector: всё ОК, confidence высокий
10. Human Mimicry: добавить "человечность"
11. Orchestrator → Adapter: отправить ответ
12. Adapter → Клиенту
13. Context Manager: сохранить в историю
14. Логирование
```

### 5.2 Передача менеджеру (AI не справился)

```
1. Клиент: "А ты точно человек? Какой у тебя любимый цвет?"
2. Adapter → UniversalMessage → Orchestrator
3. Orchestrator → Context Manager: загрузить контекст
4. Orchestrator → Situation Detector: анализ
5. Situation Detector:
   - detectAIProbing() = TRUE ⚠️
   - confidence = 0.95
   - shouldHandoff() = TRUE
6. Orchestrator → Handoff System: инициировать передачу
7. Handoff System:
   - Создает Handoff объект
   - Собирает HandoffPackage
   - Уведомляет менеджера
   - Устанавливает режим "human mode"
8. AI Engine: генерирует "stalling" ответ
9. Human Mimicry: делает естественным
10. AI клиенту: "Минуточку, уточню информацию..."
11. Менеджер получает уведомление:
    "⚠️ Клиент подозревает AI. Подключись к диалогу"
12. Менеджер видит:
    - Историю диалога
    - Профиль клиента
    - Анализ ситуации
    - Рекомендации
13. Менеджер подключается → продолжает диалог
14. Система логирует событие
15. Orchestrator: AI mode отключен для этого диалога
```

### 5.3 Сложный вопрос (нужна помощь)

```
1. Клиент: "Можно ли провести корпоратив на 50 человек с караоке и банкетом?"
2. Adapter → UniversalMessage → Orchestrator
3. Orchestrator → Context Manager
4. Orchestrator → AI Engine: попытка ответить
5. AI Engine → Knowledge Base: поиск информации
6. Knowledge Base: нет информации о караоке и банкетах
7. AI Engine → Situation Detector: оценка
8. Situation Detector:
   - complexQuery = TRUE
   - confidence = 0.3 (низкий)
   - missingInformation = ["караоке", "банкет", "50+ человек"]
   - shouldHandoff() = TRUE
9. Orchestrator → Handoff System
10. Handoff System: создает handoff (reason: "complex_query")
11. AI клиенту: "Интересное предложение! Дайте минутку, уточню возможности для такого мероприятия..."
12. Менеджер получает:
    - Запрос клиента
    - Отсутствующая информация
    - Предложение: "Нужно уточнить возможности пространства"
13. Менеджер отвечает клиенту
14. После завершения → можно вернуть AI mode
```

## 6. Конфигурация системы

### 6.1 Основная конфигурация

```yaml
system:
  name: "AI First-Line Support Agent"
  mode: "production"
  
# Личность AI
personality:
  name: "Анна" # имя менеджера, которого имитируем
  style: "friendly"
  traits:
    emoji_usage: "moderate"
    punctuation: "casual"
    vocabulary: "moderate"
    humor: true
    empathy: "high"
  
  greetings:
    - "Привет!"
    - "Здравствуйте!"
    - "Добрый день!"
  
  delays:
    - "Минуточку..."
    - "Сейчас посмотрю..."
    - "Уточню информацию..."
  
  avoid_words:
    - "я AI"
    - "я бот"
    - "я искусственный интеллект"
    - "я не человек"

# Детекция ситуаций
situation_detection:
  ai_probing:
    enabled: true
    sensitivity: "high" # low, medium, high
    keywords:
      - "ты бот"
      - "ты AI"
      - "ты человек"
      - "любимый цвет"
      - "что ты ел"
  
  complex_query:
    enabled: true
    confidence_threshold: 0.5 # ниже = передать менеджеру
  
  emotional_escalation:
    enabled: true
    keywords:
      frustrated: ["не понимаете", "уже спрашивал", "надоело"]
      angry: ["возмутительно", "кошмар", "ужас"]

# Передача менеджеру
handoff:
  enabled: true
  
  auto_handoff_triggers:
    - "ai_probing_high_confidence"
    - "emotional_angry"
    - "confidence_below_threshold"
  
  notification:
    channels: ["telegram", "slack"]
    urgent_threshold: "high"
  
  stalling_messages:
    - "Минуточку, уточню информацию..."
    - "Дайте секунду, проверю..."
    - "Сейчас посмотрю в системе..."

# База знаний
knowledge_base:
  update_interval: 3600 # seconds
  cache_enabled: true
  cache_ttl: 1800
  
  sources:
    - type: "file"
      path: "/data/knowledge/business_info.json"
    - type: "file"
      path: "/data/knowledge/faq.json"
    - type: "file"
      path: "/data/knowledge/dialogs.json"

# AI Engine
ai_engine:
  provider: "anthropic"
  model: "claude-3-sonnet-20240229"
  temperature: 0.7
  max_tokens: 500
  
  system_prompt: |
    Ты - менеджер коворкинга по имени Анна. 
    Твоя задача - помогать клиентам, отвечать на вопросы естественно и дружелюбно.
    ВАЖНО: Ты НЕ должна раскрывать, что ты AI.
    Если не знаешь ответ - скажи, что уточнишь информацию.
    Используй разговорный стиль, будь приветливой.

# Тайминг (имитация человека)
timing:
  typing_simulation: true
  base_delay: 1000 # milliseconds
  per_character: 50 # milliseconds per character
  random_variation: 0.3 # ±30%
  
  max_delay: 5000 # максимальная задержка

# Логирование
logging:
  level: "info"
  log_conversations: true
  log_handoffs: true
  log_ai_probing: true
  
  sensitive_data:
    mask_phone: true
    mask_email: true
```

## 7. Расширяемость (будущие интеграции)

### 7.1 Точки расширения

Архитектура позволяет легко добавить модули в будущем:

```
┌─────────────────────────────────────────┐
│    ТЕКУЩАЯ АРХИТЕКТУРА                  │
│    (First-Line Support)                 │
└──────────────┬──────────────────────────┘
               │
               │ В будущем можно добавить:
               ↓
┌─────────────────────────────────────────┐
│    INTEGRATION LAYER (опционально)      │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │   CRM    │  │ Calendar │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ Payments │  │ Analytics│            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

### 7.2 Как добавить интеграцию

Когда понадобится автоматизировать действия:

1. **Создать модуль интеграции** (например, `CalendarIntegration`)
2. **Подключить к Orchestrator** через стандартный интерфейс
3. **Обновить AI prompts** - добавить возможность выполнять действия
4. **Настроить Handoff** - когда передавать, когда действовать самостоятельно

**Пример будущего flow с интеграцией:**
```
Клиент: "Забронируй переговорку на завтра"
↓
AI проверяет календарь (через интеграцию)
↓
Если есть свободное время:
  - AI бронирует самостоятельно
  - Уведомляет клиента
Если нет:
  - AI предлагает альтернативы
  - При необходимости → передача менеджеру
```

## 8. Метрики успешности

### 8.1 KPI для этого проекта

**Основные метрики:**
- **Automation Rate** - процент диалогов, обработанных без передачи менеджеру (цель: 70-80%)
- **AI Detection Rate** - процент случаев, когда клиенты раскрыли AI (цель: <5%)
- **Handoff Rate** - процент передач менеджеру (цель: 20-30%)
- **Response Quality** - оценка качества ответов (цель: >4.0/5.0)
- **Client Satisfaction** - удовлетворенность клиентов (цель: >4.5/5.0)

**Дополнительные метрики:**
- Average Response Time
- False Positive Handoffs (ненужные передачи)
- Knowledge Base Coverage (% вопросов с ответами в базе)
- Handoff Resolution Time (время ответа менеджера)

### 8.2 Мониторинг

```typescript
interface IMetricsCollector {
  // Основные метрики
  trackConversation(conversationId: string, outcome: ConversationOutcome): void;
  trackHandoff(handoff: Handoff): void;
  trackAIDetection(detection: AIProbeDetection, revealed: boolean): void;
  
  // Отчеты
  getDailyReport(): Promise<DailyMetrics>;
  getWeeklyReport(): Promise<WeeklyMetrics>;
  
  // Алерты
  checkThresholds(): Promise<Alert[]>;
}

interface ConversationOutcome {
  conversationId: string;
  duration: number;
  messageCount: number;
  handedOff: boolean;
  aiDetected: boolean;
  clientSatisfaction?: number;
  resolvedSuccessfully: boolean;
}

interface DailyMetrics {
  date: Date;
  
  conversations: {
    total: number;
    automated: number;
    handedOff: number;
    automationRate: number;
  };
  
  aiDetection: {
    probeAttempts: number;
    revealed: number;
    detectionRate: number;
  };
  
  handoffs: {
    total: number;
    byReason: Record<string, number>;
    averageResponseTime: number;
  };
  
  quality: {
    averageResponseTime: number;
    clientSatisfaction: number;
  };
}
```

## 9. Безопасность и приватность

### 9.1 Защита данных клиентов

```typescript
interface IPrivacyManager {
  // Маскирование
  maskSensitiveData(text: string): string;
  
  // Хранение
  encryptClientData(data: ClientProfile): EncryptedData;
  decryptClientData(encrypted: EncryptedData): ClientProfile;
  
  // Удаление
  deleteClientData(userId: string): Promise<void>;
  anonymizeConversation(conversationId: string): Promise<void>;
}
```

**Принципы:**
- Хранить минимум персональных данных
- Шифровать чувствительную информацию
- Удалять данные по запросу (GDPR)
- Не передавать данные третьим лицам без согласия

## 10. Заключение

Эта упрощённая архитектура обеспечивает:

✅ **Естественное общение** - AI имитирует живого менеджера  
✅ **Безопасная передача** - при малейшем сомнении → менеджеру  
✅ **Контекстуальность** - AI помнит клиента и историю  
✅ **Расширяемость** - легко добавить интеграции в будущем  
✅ **Модульность** - каждый компонент независим  
✅ **Мониторинг** - полная видимость работы системы  

**Ключевое отличие от полной версии:**
- Фокус на **качестве общения**, а не на автоматизации действий
- **Handoff** как основной механизм безопасности
- **Human Mimicry** как критически важный компонент
- **Knowledge Base** как источник истины (без внешних интеграций)