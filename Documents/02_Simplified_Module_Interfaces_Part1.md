# Simplified Module Interfaces - Интерфейсы для AI первой линии

## 1. Введение

Этот документ описывает детальные интерфейсы модулей для **упрощённой версии** AI-агента первой линии поддержки.

### 1.1 Отличия от полной версии

В этом документе **только те интерфейсы**, которые реально нужны для имитации живого менеджера:

**Включено:**
- ✅ Messenger Adapters (Telegram, WhatsApp, VK)
- ✅ Context Manager (управление контекстом диалога)
- ✅ Situation Detector (когда передавать менеджеру)
- ✅ Human Mimicry (имитация человека)
- ✅ Handoff System (передача менеджеру)
- ✅ Knowledge Base (ПНД - база знаний)
- ✅ AI Engine (упрощённый)
- ✅ Data Layer (минимальный)

**Исключено:**
- ❌ CRM интеграции
- ❌ Платежные системы
- ❌ Email/SMS сервисы
- ❌ Календари
- ❌ Аналитические системы
- ❌ Сложная бизнес-логика

## 2. Базовые типы данных

### 2.1 Общие типы

```typescript
// Базовые типы
type UUID = string;
type Timestamp = number; // Unix timestamp в миллисекундах
type ISO8601DateTime = string;

// Языки
enum Language {
  RU = "ru",
  EN = "en",
  ES = "es",
  DE = "de"
}

// Типы платформ
enum PlatformType {
  TELEGRAM = "telegram",
  WHATSAPP = "whatsapp",
  VK = "vk",
  INSTAGRAM = "instagram",
  WEB = "web"
}

// Статусы
enum Status {
  SUCCESS = "success",
  ERROR = "error",
  PENDING = "pending"
}

// Результат операции
interface OperationResult<T> {
  status: Status;
  data?: T;
  error?: ErrorInfo;
  timestamp: Timestamp;
}

interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
}
```

## 3. Presentation Layer - Messenger Adapters

### 3.1 IMessengerAdapter

**Без изменений из полной версии** - используем тот же интерфейс.

```typescript
interface IMessengerAdapter {
  // Инициализация
  initialize(config: AdapterConfig): Promise<OperationResult<void>>;
  shutdown(): Promise<OperationResult<void>>;
  
  // Получение сообщений
  receiveMessage(rawData: any): Promise<OperationResult<UniversalMessage>>;
  
  // Отправка сообщений
  sendMessage(message: UniversalMessage): Promise<OperationResult<MessageSendResult>>;
  sendTypingIndicator(conversationId: string): Promise<OperationResult<void>>;
  
  // Медиа
  sendMedia(media: MediaMessage): Promise<OperationResult<MessageSendResult>>;
  downloadMedia(mediaId: string): Promise<OperationResult<MediaData>>;
  
  // Интерактивные элементы
  sendInteractiveMessage(message: InteractiveMessage): Promise<OperationResult<MessageSendResult>>;
  handleCallback(callbackData: CallbackData): Promise<OperationResult<CallbackResponse>>;
  
  // Пользователи
  getUserInfo(userId: string): Promise<OperationResult<UserInfo>>;
  
  // Утилиты
  validateWebhook(data: any): boolean;
  getPlatformType(): PlatformType;
  isHealthy(): Promise<boolean>;
}
```

### 3.2 Типы данных адаптеров

```typescript
interface AdapterConfig {
  platform: PlatformType;
  credentials: {
    token?: string;
    apiKey?: string;
    secret?: string;
  };
  webhook?: {
    url: string;
    verifyToken?: string;
  };
  options?: {
    maxConnections?: number;
    timeout?: number;
  };
}

interface UniversalMessage {
  messageId: UUID;
  conversationId: string;
  userId: string;
  timestamp: Timestamp;
  platform: PlatformType;
  platformMessageId: string;
  content: MessageContent;
  metadata: MessageMetadata;
}

interface MessageContent {
  type: MessageType;
  text?: string;
  media?: MediaInfo[];
}

enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  VOICE = "voice",
  DOCUMENT = "document",
  STICKER = "sticker"
}

interface MediaInfo {
  id: string;
  type: "image" | "video" | "audio" | "voice" | "document";
  url?: string;
  mimeType?: string;
  caption?: string;
}

interface MessageMetadata {
  language?: Language;
  tags?: string[];
  custom?: Record<string, any>;
}

interface MessageSendResult {
  messageId: string;
  platformMessageId: string;
  timestamp: Timestamp;
  status: "sent" | "delivered" | "failed";
}

interface UserInfo {
  userId: string;
  platform: PlatformType;
  platformUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  language?: Language;
  metadata?: Record<string, any>;
}
```

## 4. Context Manager - Управление контекстом

### 4.1 IContextManager

```typescript
interface IContextManager {
  // Создание и получение контекста
  createContext(userId: string, conversationId: string, platform: PlatformType): Promise<OperationResult<ConversationContext>>;
  getContext(conversationId: string): Promise<OperationResult<ConversationContext>>;
  
  // Обновление контекста
  updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<OperationResult<void>>;
  
  // История сообщений
  addMessage(conversationId: string, message: ContextMessage): Promise<OperationResult<void>>;
  getHistory(conversationId: string, limit?: number): Promise<OperationResult<ContextMessage[]>>;
  clearHistory(conversationId: string): Promise<OperationResult<void>>;
  
  // Клиент
  identifyClient(userId: string, platform: PlatformType): Promise<OperationResult<ClientProfile>>;
  updateClientProfile(userId: string, updates: Partial<ClientProfile>): Promise<OperationResult<void>>;
  getClientProfile(userId: string): Promise<OperationResult<ClientProfile>>;
  
  // Состояние разговора
  setCurrentTopic(conversationId: string, topic: string): Promise<OperationResult<void>>;
  setEmotionalState(conversationId: string, state: EmotionalState): Promise<OperationResult<void>>;
  
  // Флаги
  setSuspectAI(conversationId: string, value: boolean): Promise<OperationResult<void>>;
  setComplexQuery(conversationId: string, value: boolean): Promise<OperationResult<void>>;
  
  // Очистка
  clearContext(conversationId: string): Promise<OperationResult<void>>;
  expireOldContexts(olderThan: Timestamp): Promise<OperationResult<number>>;
}
```

### 4.2 Типы данных Context Manager

```typescript
interface ConversationContext {
  conversationId: string;
  userId: string;
  platform: PlatformType;
  
  // Временные метки
  sessionStarted: Timestamp;
  lastActivity: Timestamp;
  expiresAt: Timestamp;
  
  // Клиент
  clientType: ClientType;
  clientProfile?: ClientProfile;
  
  // История сообщений
  messageHistory: ContextMessage[];
  
  // Текущее состояние
  currentTopic?: string;
  emotionalState: EmotionalState;
  
  // Флаги для Situation Detector
  suspectAI: boolean;
  complexQuery: boolean;
  requiresHandoff: boolean;
  
  // Режим работы
  mode: ConversationMode;
  
  // Метаданные
  metadata: Record<string, any>;
}

enum ClientType {
  NEW = "new",
  RETURNING = "returning",
  VIP = "vip",
  PROBLEMATIC = "problematic"
}

interface ClientProfile {
  userId: string;
  platform: PlatformType;
  
  // Базовая информация
  name?: string;
  phoneNumber?: string;
  email?: string;
  
  // Статистика
  firstContact: Timestamp;
  lastContact: Timestamp;
  totalConversations: number;
  totalMessages: number;
  
  // Классификация
  type: ClientType;
  
  // Предпочтения
  preferredLanguage?: Language;
  communicationStyle?: CommunicationStyle;
  
  // Теги
  tags: string[];
  
  // История тем
  previousTopics: string[];
  
  // Заметки менеджера
  notes?: string[];
  
  // Метаданные
  metadata: Record<string, any>;
}

enum CommunicationStyle {
  FORMAL = "formal",
  CASUAL = "casual",
  PROFESSIONAL = "professional",
  FRIENDLY = "friendly"
}

interface ContextMessage {
  messageId: string;
  timestamp: Timestamp;
  role: MessageRole;
  content: string;
  
  // Анализ
  intent?: string;
  emotion?: string;
  confidence?: number;
  
  // Источник
  handledBy: MessageHandler;
  
  metadata?: Record<string, any>;
}

enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  MANAGER = "manager",
  SYSTEM = "system"
}

enum MessageHandler {
  AI = "ai",
  HUMAN = "human",
  SYSTEM = "system"
}

enum EmotionalState {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  FRUSTRATED = "frustrated",
  ANGRY = "angry",
  CONFUSED = "confused"
}

enum ConversationMode {
  AI = "ai",
  HUMAN = "human",
  TRANSITIONING = "transitioning"
}
```

## 5. Situation Detector - Детектор ситуаций

### 5.1 ISituationDetector

```typescript
interface ISituationDetector {
  // Общий анализ
  analyze(
    message: UniversalMessage,
    context: ConversationContext
  ): Promise<OperationResult<SituationAnalysis>>;
  
  // Специфичные детекторы
  detectAIProbing(message: string, context: ConversationContext): Promise<OperationResult<AIProbeDetection>>;
  detectComplexQuery(message: string, knowledgeBase: IKnowledgeBase): Promise<OperationResult<ComplexityScore>>;
  detectEmotionalState(message: string, history: ContextMessage[]): Promise<OperationResult<EmotionalStateDetection>>;
  assessConfidence(message: string, proposedResponse: string): Promise<OperationResult<ConfidenceScore>>;
  
  // Решение о передаче
  shouldHandoff(analysis: SituationAnalysis): boolean;
  getHandoffReason(analysis: SituationAnalysis): HandoffReason;
  
  // Конфигурация
  updateThresholds(thresholds: DetectionThresholds): Promise<OperationResult<void>>;
  getThresholds(): DetectionThresholds;
}
```

### 5.2 Типы данных Situation Detector

```typescript
interface SituationAnalysis {
  timestamp: Timestamp;
  conversationId: string;
  messageId: string;
  
  // Детекции
  aiProbing: AIProbeDetection;
  complexity: ComplexityScore;
  emotionalState: EmotionalStateDetection;
  confidence: ConfidenceScore;
  
  // Общая оценка
  overallRisk: RiskLevel;
  
  // Решение
  requiresHandoff: boolean;
  handoffReason?: HandoffReason;
  urgency: UrgencyLevel;
  
  // Рекомендации
  recommendations: string[];
  
  metadata?: Record<string, any>;
}

interface AIProbeDetection {
  detected: boolean;
  confidence: number; // 0-1
  
  indicators: AIProbeIndicator[];
  
  probingType: ProbingType;
  
  // Примеры обнаруженных паттернов
  detectedPatterns: string[];
  
  recommendation: "answer_naturally" | "deflect" | "handoff";
}

interface AIProbeIndicator {
  type: string; // "direct_question", "test_question", "technical_question"
  text: string; // что именно обнаружили
  confidence: number;
}

enum ProbingType {
  DIRECT = "direct", // "ты бот?"
  INDIRECT = "indirect", // "какой твой любимый цвет?"
  TECHNICAL = "technical", // "у тебя есть API?"
  BEHAVIORAL = "behavioral" // проверка паттернов поведения
}

interface ComplexityScore {
  score: number; // 0-100
  
  factors: ComplexityFactors;
  
  recommendation: ComplexityRecommendation;
  
  missingInformation: string[];
}

interface ComplexityFactors {
  outOfScope: boolean; // вне компетенции
  requiresCalculation: boolean; // нужны вычисления
  needsExternalData: boolean; // нужна внешняя информация
  ambiguous: boolean; // неоднозначный вопрос
  multiStep: boolean; // многошаговый процесс
  requiresPersonalization: boolean; // нужна персонализация
}

enum ComplexityRecommendation {
  ANSWER = "answer",
  CLARIFY = "clarify",
  HANDOFF = "handoff"
}

interface EmotionalStateDetection {
  state: EmotionalState;
  confidence: number;
  
  indicators: EmotionalIndicator[];
  
  changeFromPrevious?: EmotionalChange;
  
  escalationRisk: RiskLevel;
}

interface EmotionalIndicator {
  type: string; // "word_choice", "punctuation", "caps", "repetition"
  evidence: string;
  weight: number;
}

enum EmotionalChange {
  ESCALATED = "escalated",
  STABLE = "stable",
  IMPROVED = "improved"
}

interface ConfidenceScore {
  score: number; // 0-100
  
  factors: ConfidenceFactors;
  
  recommendation: ConfidenceRecommendation;
}

interface ConfidenceFactors {
  knowledgeBaseMatch: number; // есть ли ответ в базе
  responseClarity: number; // насколько чётко можем ответить
  potentialHallucination: number; // риск выдумать информацию
  contextRelevance: number; // релевантность контексту
}

enum ConfidenceRecommendation {
  SEND = "send",
  REVIEW = "review",
  HANDOFF = "handoff"
}

enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

enum UrgencyLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

interface HandoffReason {
  type: HandoffReasonType;
  description: string;
  severity: RiskLevel;
  detectedBy: string; // какой компонент обнаружил
}

enum HandoffReasonType {
  AI_PROBING = "ai_probing",
  COMPLEX_QUERY = "complex_query",
  EMOTIONAL_ESCALATION = "emotional_escalation",
  LOW_CONFIDENCE = "low_confidence",
  SPECIAL_REQUEST = "special_request",
  OUT_OF_SCOPE = "out_of_scope",
  TECHNICAL_ISSUE = "technical_issue",
  MANUAL_REQUEST = "manual_request"
}

interface DetectionThresholds {
  aiProbing: {
    minConfidence: number; // порог для определения AI probing
    handoffThreshold: number; // при каком score передавать
  };
  
  complexity: {
    maxScore: number; // выше этого = сложно
    handoffThreshold: number;
  };
  
  emotional: {
    escalationThreshold: number; // когда считать эскалацией
    handoffStates: EmotionalState[]; // при каких состояниях передавать
  };
  
  confidence: {
    minScore: number; // минимальная уверенность
    handoffThreshold: number; // ниже этого = передать
  };
}
```

## 6. Human Mimicry - Имитация человека

### 6.1 IHumanMimicry

```typescript
interface IHumanMimicry {
  // Адаптация стиля
  adaptToClientStyle(
    text: string,
    clientProfile: ClientProfile,
    recentMessages: ContextMessage[]
  ): Promise<OperationResult<string>>;
  
  // Натуральность
  makeNatural(text: string, options?: NaturalnessOptions): Promise<OperationResult<string>>;
  
  // Добавление личности
  applyPersonality(
    text: string,
    personality: PersonalityProfile
  ): Promise<OperationResult<string>>;
  
  // Тайминг
  calculateTypingDelay(text: string): number;
  simulateTyping(conversationId: string, text: string): Promise<OperationResult<void>>;
  
  // Человеческие штрихи
  addHumanTouch(text: string, options?: HumanTouchOptions): Promise<OperationResult<string>>;
  
  // Проверка на роботичность
  checkRoboticsness(text: string): RoboticnessScore;
  
  // Генерация вариаций
  generateVariations(text: string, count: number): Promise<OperationResult<string[]>>;
  
  // Конфигурация
  setPersonality(personality: PersonalityProfile): Promise<OperationResult<void>>;
  getPersonality(): PersonalityProfile;
}
```

### 6.2 Типы данных Human Mimicry

```typescript
interface PersonalityProfile {
  // Идентификация
  name: string; // имя менеджера
  role: string; // "менеджер коворкинга"
  
  // Стиль общения
  style: CommunicationStyle;
  
  // Характеристики
  traits: PersonalityTraits;
  
  // Речевые паттерны
  patterns: SpeechPatterns;
  
  // Ограничения
  restrictions: PersonalityRestrictions;
  
  metadata?: Record<string, any>;
}

interface PersonalityTraits {
  // Использование эмодзи
  emojiUsage: EmojiUsage;
  emojiFrequency: number; // 0-1, как часто использовать
  preferredEmojis: string[];
  
  // Пунктуация
  punctuation: PunctuationStyle;
  
  // Словарный запас
  vocabulary: VocabularyLevel;
  
  // Эмоциональность
  empathy: EmpathyLevel;
  enthusiasm: EnthusiasmLevel;
  
  // Дополнительно
  usesHumor: boolean;
  formalityLevel: FormalityLevel;
}

enum EmojiUsage {
  NONE = "none",
  RARE = "rare",
  MODERATE = "moderate",
  FREQUENT = "frequent"
}

enum PunctuationStyle {
  FORMAL = "formal", // Всегда точки и запятые
  CASUAL = "casual", // Иногда без точек
  MINIMAL = "minimal" // Минимум знаков
}

enum VocabularyLevel {
  SIMPLE = "simple",
  MODERATE = "moderate",
  ADVANCED = "advanced"
}

enum EmpathyLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

enum EnthusiasmLevel {
  RESERVED = "reserved",
  MODERATE = "moderate",
  ENERGETIC = "energetic"
}

enum FormalityLevel {
  VERY_FORMAL = "very_formal",
  FORMAL = "formal",
  NEUTRAL = "neutral",
  CASUAL = "casual",
  VERY_CASUAL = "very_casual"
}

interface SpeechPatterns {
  // Приветствия
  greetings: string[];
  
  // Прощания
  farewells: string[];
  
  // Подтверждения
  acknowledgments: string[];
  
  // Задержки (когда нужно время подумать)
  delays: string[];
  
  // Извинения
  apologies: string[];
  
  // Переходы между темами
  transitions: string[];
  
  // Заполнители пауз
  fillers: string[]; // "ну", "вот", "типа"
  
  // Предпочитаемые фразы
  preferredPhrases: string[];
}

interface PersonalityRestrictions {
  // Слова, которые выдают AI
  avoidWords: string[];
  
  // Темы, которых избегаем
  avoidTopics: string[];
  
  // Максимальная длина сообщения
  maxMessageLength: number;
  
  // Стиль, которого избегаем
  avoidStyles: string[];
}

interface NaturalnessOptions {
  // Добавить лёгкую опечатку (очень редко)
  allowTypo: boolean;
  
  // Добавить разговорные выражения
  useColloquialisms: boolean;
  
  // Варьировать структуру предложений
  varyStructure: boolean;
  
  // Использовать сокращения ("не знаю" → "незнаю")
  useContractions: boolean;
}

interface HumanTouchOptions {
  // Добавить паузу на размышление
  addThinkingPause: boolean;
  
  // Добавить эмодзи
  addEmoji: boolean;
  
  // Добавить разговорное выражение
  addColloquialism: boolean;
  
  // Варьировать время ответа
  varyResponseTime: boolean;
  
  // Добавить личное отношение
  addPersonalTouch: boolean;
}

interface RoboticnessScore {
  score: number; // 0-100, где 100 = очень роботично
  
  flags: RoboticnessFlags;
  
  suggestions: string[];
  
  examples: string[]; // примеры более естественных вариантов
}

interface RoboticnessFlags {
  tooFormal: boolean;
  tooPerfect: boolean;
  repetitiveStructure: boolean;
  unnaturalPhrasing: boolean;
  noPersonality: boolean;
  instantResponse: boolean;
  noEmotionalCues: boolean;
  overexplaination: boolean;
}
```

## 7. Handoff System - Система передачи

### 7.1 IHandoffSystem

```typescript
interface IHandoffSystem {
  // Инициация передачи
  initiateHandoff(
    conversationId: string,
    reason: HandoffReason,
    context: ConversationContext
  ): Promise<OperationResult<HandoffResult>>;
  
  // Управление режимами
  setHumanMode(conversationId: string): Promise<OperationResult<void>>;
  setAIMode(conversationId: string): Promise<OperationResult<void>>;
  isHumanMode(conversationId: string): Promise<OperationResult<boolean>>;
  
  // Уведомления менеджера
  notifyManager(handoff: Handoff, channels?: NotificationChannel[]): Promise<OperationResult<void>>;
  
  // Подготовка информации для менеджера
  prepareHandoffPackage(conversationId: string): Promise<OperationResult<HandoffPackage>>;
  
  // Генерация "stalling" сообщений
  generateStallingMessage(reason: HandoffReason): Promise<OperationResult<string>>;
  
  // Управление handoff
  acceptHandoff(handoffId: string, managerId: string): Promise<OperationResult<void>>;
  resolveHandoff(handoffId: string, resolution: HandoffResolution): Promise<OperationResult<void>>;
  cancelHandoff(handoffId: string, reason: string): Promise<OperationResult<void>>;
  
  // Получение информации
  getHandoff(handoffId: string): Promise<OperationResult<Handoff>>;
  getPendingHandoffs(): Promise<OperationResult<Handoff[]>>;
  getHandoffHistory(conversationId: string): Promise<OperationResult<Handoff[]>>;
  
  // Статистика
  getHandoffStats(period?: DateRange): Promise<OperationResult<HandoffStats>>;
  
  // Конфигурация
  updateConfig(config: HandoffConfig): Promise<OperationResult<void>>;
  getConfig(): HandoffConfig;
}
```

### 7.2 Типы данных Handoff System

```typescript
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
  notifiedAt?: Timestamp;
  acceptedAt?: Timestamp;
  resolvedAt?: Timestamp;
  
  // Назначение
  assignedTo?: string; // manager ID
  acceptedBy?: string; // manager ID
  
  // Статус
  status: HandoffStatus;
  
  // Приоритет
  priority: HandoffPriority;
  
  // Результат
  resolution?: HandoffResolution;
  
  // Метаданные
  metadata: Record<string, any>;
}

enum HandoffStatus {
  PENDING = "pending",
  NOTIFIED = "notified",
  ACCEPTED = "accepted",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CANCELLED = "cancelled"
}

enum HandoffPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}

interface HandoffResult {
  success: boolean;
  handoffId: string;
  
  // Сообщение для показа клиенту
  stallingMessage: string;
  
  // Оценка времени ожидания
  estimatedWaitTime?: number; // seconds
  
  // Дополнительно
  notificationsSent: number;
  
  metadata?: Record<string, any>;
}

interface HandoffPackage {
  // Основная информация
  handoff: Handoff;
  
  // Клиент
  client: ClientProfile;
  
  // История диалога
  conversationHistory: ContextMessage[];
  
  // Контекст
  context: ConversationContext;
  
  // Анализ ситуации
  situationAnalysis: SituationAnalysis;
  
  // Рекомендации для менеджера
  recommendations: ManagerRecommendation[];
  
  // Срочные заметки
  urgentNotes: string[];
  
  // Релевантная информация из базы знаний
  relevantKnowledge: KnowledgeSnippet[];
  
  // Предложенные ответы
  suggestedResponses?: string[];
  
  metadata?: Record<string, any>;
}

interface ManagerRecommendation {
  type: RecommendationType;
  description: string;
  priority: number;
}

enum RecommendationType {
  TONE = "tone", // рекомендации по тону
  INFORMATION = "information", // какую информацию предоставить
  ACTION = "action", // какие действия предпринять
  WARNING = "warning" // предупреждения
}

interface KnowledgeSnippet {
  source: string;
  content: string;
  relevance: number;
  category: string;
}

interface HandoffResolution {
  status: ResolutionStatus;
  
  // Описание результата
  summary: string;
  
  // Вернуть ли в AI mode
  returnToAI: boolean;
  
  // Обновления для клиента
  clientUpdates?: ClientProfileUpdate[];
  
  // Обновления для базы знаний
  knowledgeUpdates?: KnowledgeUpdate[];
  
  // Feedback для AI
  aiFeedback?: AIFeedback;
  
  metadata?: Record<string, any>;
}

enum ResolutionStatus {
  RESOLVED_SUCCESSFULLY = "resolved_successfully",
  RESOLVED_WITH_ISSUES = "resolved_with_issues",
  ESCALATED = "escalated",
  CLOSED_NO_RESPONSE = "closed_no_response"
}

interface ClientProfileUpdate {
  field: string;
  value: any;
  reason: string;
}

interface KnowledgeUpdate {
  type: "add" | "update" | "flag";
  content: any;
  reason: string;
}

interface AIFeedback {
  correctResponse: boolean;
  shouldHaveHandedOff: boolean;
  handoffTooEarly: boolean;
  comments: string;
}

enum NotificationChannel {
  TELEGRAM = "telegram",
  EMAIL = "email",
  SMS = "sms",
  SLACK = "slack",
  WEBHOOK = "webhook"
}

interface HandoffConfig {
  // Автоматическая передача
  autoHandoffTriggers: HandoffReasonType[];
  
  // Уведомления
  notificationChannels: NotificationChannel[];
  urgentNotificationChannels: NotificationChannel[];
  
  // Stalling messages
  stallingMessages: string[];
  customStallingMessages: Record<HandoffReasonType, string[]>;
  
  // Тайминги
  estimatedWaitTime: number; // default seconds
  maxWaitBeforeEscalation: number;
  
  // Приоритизация
  priorityRules: PriorityRule[];
  
  metadata?: Record<string, any>;
}

interface PriorityRule {
  condition: string; // условие для оценки
  priority: HandoffPriority;
  description: string;
}

interface HandoffStats {
  period: DateRange;
  
  // Общая статистика
  total: number;
  byStatus: Record<HandoffStatus, number>;
  byReason: Record<HandoffReasonType, number>;
  byPriority: Record<HandoffPriority, number>;
  
  // Тайминг
  averageResponseTime: number;
  averageResolutionTime: number;
  medianWaitTime: number;
  
  // Результаты
  resolvedSuccessfully: number;
  returnedToAI: number;
  escalated: number;
  
  // Тренды
  trend: TrendDirection;
  comparedToPrevious?: number; // процентное изменение
  
  // По менеджерам
  byManager?: Record<string, ManagerHandoffStats>;
}

enum TrendDirection {
  INCREASING = "increasing",
  STABLE = "stable",
  DECREASING = "decreasing"
}

interface ManagerHandoffStats {
  managerId: string;
  handled: number;
  averageResolutionTime: number;
  successRate: number;
}

interface DateRange {
  start: Date;
  end: Date;
}
```

## 8. Knowledge Base - База знаний (ПНД)

### 8.1 IKnowledgeBase

```typescript
interface IKnowledgeBase {
  // Поиск
  search(query: string, options?: SearchOptions): Promise<OperationResult<SearchResult[]>>;
  findRelevant(query: string, limit?: number): Promise<OperationResult<KnowledgeItem[]>>;
  
  // Получение по категории
  getByCategory(category: KnowledgeCategory): Promise<OperationResult<KnowledgeItem[]>>;
  getByTags(tags: string[]): Promise<OperationResult<KnowledgeItem[]>>;
  
  // Конкретные типы знаний
  getBusinessInfo(): Promise<OperationResult<BusinessInfo>>;
  getServices(): Promise<OperationResult<Service[]>>;
  getFAQ(category?: string): Promise<OperationResult<FAQItem[]>>;
  getPolicies(type?: PolicyType): Promise<OperationResult<Policy[]>>;
  getDialogExamples(situation?: string): Promise<OperationResult<DialogExample[]>>;
  
  // Проверка наличия информации
  hasInformation(query: string): Promise<OperationResult<boolean>>;
  getConfidence(query: string): Promise<OperationResult<number>>;
  
  // Управление знаниями (для админов)
  addKnowledge(item: KnowledgeItem): Promise<OperationResult<void>>;
  updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<OperationResult<void>>;
  deleteKnowledge(id: string): Promise<OperationResult<void>>;
  
  // Обновление
  reload(): Promise<OperationResult<void>>;
  getLastUpdate(): Timestamp;
  
  // Статистика
  getStats(): Promise<OperationResult<KnowledgeBaseStats>>;
}
```

### 8.2 Типы данных Knowledge Base

```typescript
interface SearchOptions {
  categories?: KnowledgeCategory[];
  limit?: number;
  minRelevance?: number;
  includeMetadata?: boolean;
}

interface SearchResult {
  item: KnowledgeItem;
  relevance: number; // 0-1
  matchedTerms: string[];
  snippet: string; // краткий отрывок
}

interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  category: KnowledgeCategory;
  
  content: any; // зависит от типа
  
  // Метаданные
  title: string;
  description?: string;
  tags: string[];
  
  // Поиск
  keywords: string[];
  alternativeQuestions?: string[];
  
  // Качество
  confidence: number; // 0-1
  lastVerified: Timestamp;
  
  // Использование
  usageCount: number;
  lastUsed?: Timestamp;
  
  metadata: Record<string, any>;
}

enum KnowledgeType {
  BUSINESS_INFO = "business_info",
  SERVICE = "service",
  FAQ = "faq",
  POLICY = "policy",
  DIALOG_EXAMPLE = "dialog_example",
  PROCEDURE = "procedure",
  TEAM_MEMBER = "team_member"
}

enum KnowledgeCategory {
  GENERAL = "general",
  PRICING = "pricing",
  BOOKING = "booking",
  SERVICES = "services",
  POLICIES = "policies",
  LOCATION = "location",
  TEAM = "team",
  TECHNICAL = "technical",
  OTHER = "other"
}

interface BusinessInfo {
  // Основное
  name: string;
  type: BusinessType;
  description: string;
  tagline?: string;
  
  // Контакты
  contacts: BusinessContacts;
  
  // Локация
  location: BusinessLocation;
  
  // Режим работы
  workingHours: WorkingHours;
  
  // Особенности
  amenities: string[];
  features: string[];
  rules: string[];
  
  // Команда
  team: TeamMember[];
  
  // Социальные сети
  socialMedia?: SocialMedia;
  
  metadata: Record<string, any>;
}

enum BusinessType {
  COWORKING = "coworking",
  SALON = "salon",
  FITNESS = "fitness",
  CAFE = "cafe",
  OTHER = "other"
}

interface BusinessContacts {
  phone: string;
  email: string;
  website?: string;
  
  // Дополнительные
  whatsapp?: string;
  telegram?: string;
  
  // Экстренные
  emergencyPhone?: string;
}

interface BusinessLocation {
  address: string;
  city: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  
  // Как добраться
  directions?: string;
  nearestMetro?: string;
  parking?: string;
  
  // Дополнительно
  floor?: number;
  entrance?: string;
}

interface WorkingHours {
  // По дням недели
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  
  // Праздники
  holidays: Holiday[];
  
  // Особые дни
  specialDays?: SpecialDay[];
  
  // Временная зона
  timezone: string;
}

interface DaySchedule {
  open: string; // "09:00"
  close: string; // "23:00"
  breaks?: TimeSlot[];
  note?: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface Holiday {
  date: Date;
  name: string;
  open: boolean;
  specialHours?: DaySchedule;
}

interface SpecialDay {
  date: Date;
  reason: string;
  schedule: DaySchedule;
}

interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  specialization?: string[];
  languages?: Language[];
  availability?: string;
}

interface SocialMedia {
  instagram?: string;
  facebook?: string;
  vk?: string;
  linkedin?: string;
  youtube?: string;
}

interface Service {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  
  // Цены
  pricing: ServicePricing[];
  
  // Доступность
  available: boolean;
  availabilityNote?: string;
  
  // Детали
  duration?: number; // minutes
  capacity?: number; // количество человек
  features: string[];
  
  // Популярность
  popular: boolean;
  recommended: boolean;
  
  // Медиа
  images?: string[];
  video?: string;
  
  // Связанные услуги
  relatedServices?: string[];
  
  tags: string[];
  metadata: Record<string, any>;
}

interface ServicePricing {
  amount: number;
  currency: string;
  unit: PricingUnit;
  
  conditions?: string;
  discount?: Discount;
  
  validFrom?: Date;
  validTo?: Date;
}

enum PricingUnit {
  HOUR = "hour",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  SESSION = "session",
  PERSON = "person"
}

interface Discount {
  type: "percentage" | "fixed";
  value: number;
  description: string;
}

interface FAQItem {
  faqId: string;
  question: string;
  answer: string;
  category: KnowledgeCategory;
  
  // Варианты вопроса
  alternativeQuestions: string[];
  
  // Связанные вопросы
  relatedQuestions: string[];
  
  // Популярность
  popularity: number;
  
  // Медиа
  images?: string[];
  links?: FAQLink[];
  
  tags: string[];
  metadata: Record<string, any>;
}

interface FAQLink {
  text: string;
  url: string;
  type: "internal" | "external";
}

interface Policy {
  policyId: string;
  name: string;
  type: PolicyType;
  content: string;
  
  // Краткая версия
  summary: string;
  
  // Ключевые моменты
  keyPoints: string[];
  
  // Версионирование
  version: string;
  effectiveDate: Date;
  lastUpdated: Timestamp;
  
  tags: string[];
  metadata: Record<string, any>;
}

enum PolicyType {
  CANCELLATION = "cancellation",
  REFUND = "refund",
  PRIVACY = "privacy",
  TERMS = "terms",
  RULES = "rules",
  SAFETY = "safety",
  OTHER = "other"
}

interface DialogExample {
  exampleId: string;
  
  // Контекст
  situation: string;
  clientType: ClientType;
  
  // Диалог
  messages: DialogMessage[];
  
  // Результат
  outcome: DialogOutcome;
  
  // Качество
  quality: number; // 1-5
  
  // Что можно извлечь
  learnings: string[];
  keyPhrases: string[];
  
  tags: string[];
  metadata: Record<string, any>;
}

interface DialogMessage {
  role: "client" | "manager";
  text: string;
  
  // Анализ
  intent?: string;
  emotion?: string;
  
  // Примечания
  note?: string;
  
  metadata?: Record<string, any>;
}

enum DialogOutcome {
  SUCCESSFUL = "successful",
  ESCALATED = "escalated",
  NEGATIVE = "negative",
  NEUTRAL = "neutral"
}

interface KnowledgeBaseStats {
  totalItems: number;
  byType: Record<KnowledgeType, number>;
  byCategory: Record<KnowledgeCategory, number>;
  
  lastUpdate: Timestamp;
  
  mostUsed: KnowledgeItem[];
  leastUsed: KnowledgeItem[];
  
  averageConfidence: number;
  itemsNeedingReview: number;
}

