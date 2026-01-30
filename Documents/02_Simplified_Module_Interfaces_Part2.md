# Simplified Module Interfaces - Интерфейсы для AI первой линии (Часть 2)

## 9. AI Engine - Упрощённый AI движок

### 9.1 ISimplifiedAIEngine

```typescript
interface ISimplifiedAIEngine {
  // Инициализация
  initialize(config: AIEngineConfig): Promise<OperationResult<void>>;
  
  // Генерация ответа (основная функция)
  generateResponse(request: AIRequest): Promise<OperationResult<AIResponse>>;
  
  // Генерация естественного ответа (с учётом человечности)
  generateHumanLikeResponse(
    message: string,
    context: ConversationContext,
    knowledgeBase: IKnowledgeBase,
    personality: PersonalityProfile
  ): Promise<OperationResult<HumanLikeResponse>>;
  
  // Анализ намерения
  analyzeIntent(message: string, context: ConversationContext): Promise<OperationResult<IntentAnalysis>>;
  
  // Проверка ответа
  validateResponse(
    response: string,
    context: ConversationContext
  ): Promise<OperationResult<ValidationResult>>;
  
  // Генерация вариаций
  generateResponseVariations(
    response: string,
    count: number
  ): Promise<OperationResult<string[]>>;
  
  // Управление провайдерами
  switchProvider(providerId: string): Promise<OperationResult<void>>;
  getActiveProvider(): string;
  
  // Статистика
  getUsageStats(): Promise<OperationResult<AIUsageStats>>;
}
```

### 9.2 Типы данных AI Engine

```typescript
interface AIEngineConfig {
  // Провайдер
  provider: AIProvider;
  model: string;
  
  // Параметры генерации
  temperature: number; // 0-1, креативность
  maxTokens: number;
  topP?: number;
  
  // Fallback
  fallbackProvider?: AIProvider;
  fallbackModel?: string;
  
  // Система
  systemPrompt: string;
  
  // Лимиты
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  
  // Кэширование
  cacheEnabled: boolean;
  cacheTTL?: number;
  
  metadata?: Record<string, any>;
}

enum AIProvider {
  ANTHROPIC = "anthropic",
  OPENAI = "openai",
  LOCAL = "local",
  CUSTOM = "custom"
}

interface AIRequest {
  // Входные данные
  message: string;
  
  // Контекст
  context: ConversationContext;
  
  // База знаний
  relevantKnowledge: KnowledgeItem[];
  
  // Личность
  personality: PersonalityProfile;
  
  // Параметры
  parameters?: AIParameters;
  
  // Инструкции
  systemPrompt?: string;
  additionalInstructions?: string[];
  
  metadata?: Record<string, any>;
}

interface AIParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

interface AIResponse {
  // Ответ
  text: string;
  
  // Метаданные ответа
  metadata: AIResponseMetadata;
  
  // Анализ
  analysis?: ResponseAnalysis;
  
  // Альтернативы
  alternatives?: string[];
}

interface AIResponseMetadata {
  // Провайдер
  provider: string;
  model: string;
  
  // Использование
  tokensUsed: number;
  latency: number; // milliseconds
  
  // Качество
  confidence?: number;
  finishReason: "stop" | "length" | "error";
  
  // Кэш
  cached: boolean;
  
  timestamp: Timestamp;
}

interface ResponseAnalysis {
  // Анализ содержания
  containsQuestion: boolean;
  containsInstruction: boolean;
  emotionalTone: string;
  
  // Потенциальные проблемы
  possibleHallucination: boolean;
  offTopic: boolean;
  tooRobotic: boolean;
  
  // Рекомендации
  needsImprovement: boolean;
  suggestions?: string[];
}

interface HumanLikeResponse {
  // Финальный ответ
  text: string;
  
  // Метаданные
  confidence: number;
  requiresHandoff: boolean;
  handoffReason?: HandoffReason;
  
  // Тайминг для имитации человека
  typingDelay: number;
  pauseBeforeSend: number;
  
  // Анализ
  usedKnowledge: string[]; // какие части базы знаний использовались
  detectedIntent?: string;
  
  // Дополнительно
  suggestedFollowUp?: string[];
  internalNotes?: string[];
  
  metadata?: Record<string, any>;
}

interface IntentAnalysis {
  // Основное намерение
  primaryIntent: string;
  confidence: number;
  
  // Альтернативные намерения
  alternativeIntents: AlternativeIntent[];
  
  // Извлечённые сущности
  entities: Entity[];
  
  // Категория
  category: string;
  
  // Дополнительно
  requiresClarification: boolean;
  reasoning?: string;
}

interface AlternativeIntent {
  intent: string;
  confidence: number;
}

interface Entity {
  type: string;
  value: any;
  confidence: number;
  start?: number;
  end?: number;
}

interface ValidationResult {
  valid: boolean;
  
  issues: ValidationIssue[];
  
  recommendation: ValidationRecommendation;
  
  // Оценка качества
  qualityScore: number; // 0-100
}

interface ValidationIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  suggestion?: string;
}

enum IssueType {
  TOO_ROBOTIC = "too_robotic",
  INCORRECT_INFO = "incorrect_info",
  INAPPROPRIATE = "inappropriate",
  OFF_TOPIC = "off_topic",
  TOO_LONG = "too_long",
  TOO_SHORT = "too_short",
  LACKS_EMPATHY = "lacks_empathy",
  OVERLY_FORMAL = "overly_formal",
  POSSIBLE_HALLUCINATION = "possible_hallucination"
}

enum IssueSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

enum ValidationRecommendation {
  SEND = "send",
  IMPROVE = "improve",
  REGENERATE = "regenerate",
  HANDOFF = "handoff"
}

interface AIUsageStats {
  timestamp: Timestamp;
  
  // Использование
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // Токены
  totalTokens: number;
  averageTokensPerRequest: number;
  
  // Производительность
  averageLatency: number;
  medianLatency: number;
  
  // Качество
  averageConfidence: number;
  handoffRate: number;
  
  // По периодам
  hourly?: PeriodStats;
  daily?: PeriodStats;
  
  metadata?: Record<string, any>;
}

interface PeriodStats {
  requests: number;
  tokens: number;
  averageLatency: number;
}
```

## 10. Data Layer - Упрощённый слой данных

### 10.1 ISimplifiedDataLayer

Главный интерфейс для доступа ко всем репозиториям.

```typescript
interface ISimplifiedDataLayer {
  // Репозитории
  conversations: IConversationRepository;
  clients: IClientRepository;
  knowledge: IKnowledgeRepository;
  handoffs: IHandoffRepository;
  logs: ILogRepository;
  
  // Общие методы
  healthCheck(): Promise<OperationResult<DataLayerHealth>>;
  cleanup(olderThan: Timestamp): Promise<OperationResult<CleanupResult>>;
}
```

### 10.2 IConversationRepository

```typescript
interface IConversationRepository {
  // CRUD
  create(conversation: Conversation): Promise<OperationResult<void>>;
  get(conversationId: string): Promise<OperationResult<Conversation>>;
  update(conversationId: string, updates: Partial<Conversation>): Promise<OperationResult<void>>;
  delete(conversationId: string): Promise<OperationResult<void>>;
  
  // Поиск
  findByUserId(userId: string, limit?: number): Promise<OperationResult<Conversation[]>>;
  findActive(userId: string): Promise<OperationResult<Conversation | null>>;
  findByPlatform(platform: PlatformType): Promise<OperationResult<Conversation[]>>;
  
  // Сообщения
  addMessage(conversationId: string, message: ContextMessage): Promise<OperationResult<void>>;
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<OperationResult<ContextMessage[]>>;
  clearMessages(conversationId: string): Promise<OperationResult<void>>;
  
  // Контекст
  updateContext(conversationId: string, context: Partial<ConversationContext>): Promise<OperationResult<void>>;
  
  // Закрытие
  close(conversationId: string): Promise<OperationResult<void>>;
  closeInactive(inactiveSince: Timestamp): Promise<OperationResult<number>>;
  
  // Статистика
  getStats(conversationId: string): Promise<OperationResult<ConversationStats>>;
  getAggregateStats(period?: DateRange): Promise<OperationResult<AggregateConversationStats>>;
}
```

### 10.3 IClientRepository

```typescript
interface IClientRepository {
  // CRUD
  create(client: ClientProfile): Promise<OperationResult<void>>;
  get(userId: string): Promise<OperationResult<ClientProfile>>;
  update(userId: string, updates: Partial<ClientProfile>): Promise<OperationResult<void>>;
  delete(userId: string): Promise<OperationResult<void>>;
  
  // Поиск
  findByPlatform(platform: PlatformType, platformUserId: string): Promise<OperationResult<ClientProfile | null>>;
  findByType(type: ClientType): Promise<OperationResult<ClientProfile[]>>;
  findByTags(tags: string[]): Promise<OperationResult<ClientProfile[]>>;
  search(query: string): Promise<OperationResult<ClientProfile[]>>;
  
  // Теги
  addTag(userId: string, tag: string): Promise<OperationResult<void>>;
  removeTag(userId: string, tag: string): Promise<OperationResult<void>>;
  getTags(userId: string): Promise<OperationResult<string[]>>;
  
  // Заметки
  addNote(userId: string, note: string): Promise<OperationResult<void>>;
  getNotes(userId: string): Promise<OperationResult<string[]>>;
  
  // Активность
  updateLastActivity(userId: string): Promise<OperationResult<void>>;
  getActiveClients(since: Timestamp): Promise<OperationResult<ClientProfile[]>>;
  
  // Статистика
  getStats(userId: string): Promise<OperationResult<ClientStats>>;
}
```

### 10.4 IKnowledgeRepository

```typescript
interface IKnowledgeRepository {
  // Поиск
  search(query: string, options?: SearchOptions): Promise<OperationResult<KnowledgeItem[]>>;
  findById(id: string): Promise<OperationResult<KnowledgeItem>>;
  findByCategory(category: KnowledgeCategory): Promise<OperationResult<KnowledgeItem[]>>;
  findByTags(tags: string[]): Promise<OperationResult<KnowledgeItem[]>>;
  findByType(type: KnowledgeType): Promise<OperationResult<KnowledgeItem[]>>;
  
  // CRUD
  add(item: KnowledgeItem): Promise<OperationResult<void>>;
  update(id: string, updates: Partial<KnowledgeItem>): Promise<OperationResult<void>>;
  delete(id: string): Promise<OperationResult<void>>;
  
  // Массовые операции
  addMany(items: KnowledgeItem[]): Promise<OperationResult<void>>;
  updateMany(updates: Array<{ id: string; data: Partial<KnowledgeItem> }>): Promise<OperationResult<void>>;
  
  // Использование
  incrementUsage(id: string): Promise<OperationResult<void>>;
  updateLastUsed(id: string): Promise<OperationResult<void>>;
  
  // Статистика
  getStats(): Promise<OperationResult<KnowledgeBaseStats>>;
  getMostUsed(limit?: number): Promise<OperationResult<KnowledgeItem[]>>;
  getLeastUsed(limit?: number): Promise<OperationResult<KnowledgeItem[]>>;
  
  // Обновление
  reload(): Promise<OperationResult<void>>;
  export(): Promise<OperationResult<KnowledgeExport>>;
  import(data: KnowledgeExport): Promise<OperationResult<void>>;
}
```

### 10.5 IHandoffRepository

```typescript
interface IHandoffRepository {
  // CRUD
  create(handoff: Handoff): Promise<OperationResult<void>>;
  get(handoffId: string): Promise<OperationResult<Handoff>>;
  update(handoffId: string, updates: Partial<Handoff>): Promise<OperationResult<void>>;
  delete(handoffId: string): Promise<OperationResult<void>>;
  
  // Поиск
  findByConversation(conversationId: string): Promise<OperationResult<Handoff[]>>;
  findByManager(managerId: string): Promise<OperationResult<Handoff[]>>;
  findByStatus(status: HandoffStatus): Promise<OperationResult<Handoff[]>>;
  findByPriority(priority: HandoffPriority): Promise<OperationResult<Handoff[]>>;
  
  // Очередь
  getPending(): Promise<OperationResult<Handoff[]>>;
  getNext(managerId?: string): Promise<OperationResult<Handoff | null>>;
  
  // Назначение
  assign(handoffId: string, managerId: string): Promise<OperationResult<void>>;
  accept(handoffId: string, managerId: string): Promise<OperationResult<void>>;
  resolve(handoffId: string, resolution: HandoffResolution): Promise<OperationResult<void>>;
  
  // Статистика
  getStats(period?: DateRange): Promise<OperationResult<HandoffStats>>;
  getManagerStats(managerId: string, period?: DateRange): Promise<OperationResult<ManagerHandoffStats>>;
  
  // Очистка
  deleteOld(olderThan: Timestamp): Promise<OperationResult<number>>;
}
```

### 10.6 ILogRepository

```typescript
interface ILogRepository {
  // Логирование
  log(entry: LogEntry): Promise<OperationResult<void>>;
  logMany(entries: LogEntry[]): Promise<OperationResult<void>>;
  
  // Специфичное логирование
  logHandoff(handoff: Handoff): Promise<OperationResult<void>>;
  logAIProbing(detection: AIProbeDetection, context: ConversationContext): Promise<OperationResult<void>>;
  logError(error: Error, context?: any): Promise<OperationResult<void>>;
  
  // Поиск
  query(filter: LogFilter): Promise<OperationResult<LogEntry[]>>;
  findByLevel(level: LogLevel): Promise<OperationResult<LogEntry[]>>;
  findByComponent(component: string): Promise<OperationResult<LogEntry[]>>;
  findByConversation(conversationId: string): Promise<OperationResult<LogEntry[]>>;
  
  // Очистка
  deleteOld(olderThan: Timestamp): Promise<OperationResult<number>>;
  
  // Статистика
  getStats(period?: DateRange): Promise<OperationResult<LogStats>>;
}
```

### 10.7 Типы данных Data Layer

```typescript
interface Conversation {
  conversationId: UUID;
  userId: string;
  platform: PlatformType;
  
  // Контекст
  context: ConversationContext;
  
  // Временные метки
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  closedAt?: Timestamp;
  
  // Статус
  active: boolean;
  mode: ConversationMode;
  
  // Метаданные
  metadata: Record<string, any>;
}

interface ConversationStats {
  conversationId: string;
  
  messageCount: number;
  userMessages: number;
  aiMessages: number;
  managerMessages: number;
  
  duration: number; // milliseconds
  
  averageResponseTime: number;
  
  handoffs: number;
  
  emotionalJourney: EmotionalState[];
}

interface AggregateConversationStats {
  period: DateRange;
  
  total: number;
  active: number;
  closed: number;
  
  averageDuration: number;
  averageMessages: number;
  
  byPlatform: Record<PlatformType, number>;
  byMode: Record<ConversationMode, number>;
  
  totalHandoffs: number;
  handoffRate: number;
}

interface ClientStats {
  userId: string;
  
  totalConversations: number;
  totalMessages: number;
  
  averageConversationDuration: number;
  
  preferredPlatform: PlatformType;
  preferredTime?: string; // "morning", "afternoon", "evening"
  
  satisfactionScore?: number;
  
  lastActivity: Timestamp;
}

interface KnowledgeExport {
  version: string;
  exportedAt: Timestamp;
  
  businessInfo: BusinessInfo;
  services: Service[];
  faq: FAQItem[];
  policies: Policy[];
  dialogExamples: DialogExample[];
  
  metadata?: Record<string, any>;
}

interface DataLayerHealth {
  status: "healthy" | "degraded" | "down";
  
  repositories: {
    conversations: RepoHealth;
    clients: RepoHealth;
    knowledge: RepoHealth;
    handoffs: RepoHealth;
    logs: RepoHealth;
  };
  
  lastCheck: Timestamp;
}

interface RepoHealth {
  status: "up" | "down" | "slow";
  latency: number;
  errorRate: number;
}

interface CleanupResult {
  conversationsDeleted: number;
  handoffsDeleted: number;
  logsDeleted: number;
  
  spaceSaved: number; // bytes
  
  timestamp: Timestamp;
}

interface LogEntry {
  logId: UUID;
  timestamp: Timestamp;
  
  level: LogLevel;
  component: string;
  
  message: string;
  details?: string;
  
  // Контекст
  conversationId?: string;
  userId?: string;
  handoffId?: string;
  
  // Технические детали
  stackTrace?: string;
  errorCode?: string;
  
  metadata?: Record<string, any>;
}

enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

interface LogFilter {
  levels?: LogLevel[];
  components?: string[];
  conversationId?: string;
  userId?: string;
  dateRange?: DateRange;
  search?: string;
  limit?: number;
  offset?: number;
}

interface LogStats {
  period: DateRange;
  
  total: number;
  byLevel: Record<LogLevel, number>;
  byComponent: Record<string, number>;
  
  errorRate: number;
  warningRate: number;
  
  topErrors: Array<{
    message: string;
    count: number;
  }>;
}
```

## 11. Utility Interfaces - Вспомогательные интерфейсы

### 11.1 ILogger

```typescript
interface ILogger {
  // Уровни логирования
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  critical(message: string, error?: Error, context?: LogContext): void;
  
  // Структурированное логирование
  log(level: LogLevel, message: string, data?: any, context?: LogContext): void;
  
  // Контекст
  setContext(context: LogContext): void;
  clearContext(): void;
  
  // Дочерние логгеры
  child(context: LogContext): ILogger;
}

interface LogContext {
  component?: string;
  conversationId?: string;
  userId?: string;
  handoffId?: string;
  custom?: Record<string, any>;
}
```

### 11.2 IEventBus

```typescript
interface IEventBus {
  // Подписка
  subscribe<T>(eventType: string, handler: EventHandler<T>): Subscription;
  
  // Публикация
  publish<T>(event: Event<T>): Promise<void>;
  
  // Отписка
  unsubscribe(subscription: Subscription): void;
}

type EventHandler<T> = (event: Event<T>) => Promise<void> | void;

interface Event<T> {
  eventId: UUID;
  eventType: string;
  timestamp: Timestamp;
  source: string;
  data: T;
  metadata?: Record<string, any>;
}

interface Subscription {
  subscriptionId: string;
  eventType: string;
  unsubscribe: () => void;
}
```

### 11.3 IValidator

```typescript
interface IValidator {
  // Валидация
  validate<T>(data: T, schema: ValidationSchema): ValidationResult;
  validateAsync<T>(data: T, schema: ValidationSchema): Promise<ValidationResult>;
  
  // Проверки
  isValid<T>(data: T, schema: ValidationSchema): boolean;
}

interface ValidationSchema {
  type: "object" | "array" | "string" | "number" | "boolean";
  properties?: Record<string, ValidationSchema>;
  required?: boolean;
  rules?: ValidationRule[];
}

interface ValidationRule {
  name: string;
  params?: any;
  message?: string;
  validate: (value: any, params?: any) => boolean;
}
```

### 11.4 ICacheService

```typescript
interface ICacheService {
  // Базовые операции
  get<T>(key: string): Promise<OperationResult<T | null>>;
  set<T>(key: string, value: T, ttl?: number): Promise<OperationResult<void>>;
  delete(key: string): Promise<OperationResult<void>>;
  
  // Существование
  exists(key: string): Promise<OperationResult<boolean>>;
  
  // TTL
  getTTL(key: string): Promise<OperationResult<number>>;
  setTTL(key: string, ttl: number): Promise<OperationResult<void>>;
  
  // Очистка
  clear(): Promise<OperationResult<void>>;
  deleteByPattern(pattern: string): Promise<OperationResult<number>>;
  
  // Статистика
  getStats(): Promise<OperationResult<CacheStats>>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}
```

### 11.5 IConfigManager

```typescript
interface IConfigManager {
  // Получение конфигурации
  get<T>(key: string): T;
  getAll(): Record<string, any>;
  
  // Обновление конфигурации
  set(key: string, value: any): Promise<OperationResult<void>>;
  setMany(config: Record<string, any>): Promise<OperationResult<void>>;
  
  // Перезагрузка
  reload(): Promise<OperationResult<void>>;
  
  // Валидация
  validate(config: Record<string, any>): ValidationResult;
}
```

### 11.6 IMetricsCollector

```typescript
interface IMetricsCollector {
  // Сбор метрик
  trackConversation(conversation: Conversation, outcome: ConversationOutcome): void;
  trackHandoff(handoff: Handoff): void;
  trackAIProbing(detection: AIProbeDetection, revealed: boolean): void;
  trackResponse(response: HumanLikeResponse): void;
  
  // Кастомные метрики
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  
  // Отчёты
  getDailyReport(): Promise<OperationResult<DailyMetrics>>;
  getWeeklyReport(): Promise<OperationResult<WeeklyMetrics>>;
  getCustomReport(params: ReportParams): Promise<OperationResult<CustomReport>>;
  
  // Алерты
  checkThresholds(): Promise<OperationResult<Alert[]>>;
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
    byReason: Record<HandoffReasonType, number>;
    averageResponseTime: number;
  };
  
  quality: {
    averageResponseTime: number;
    clientSatisfaction: number;
  };
}

interface WeeklyMetrics extends DailyMetrics {
  startDate: Date;
  endDate: Date;
  
  trends: {
    conversations: TrendDirection;
    automationRate: TrendDirection;
    detectionRate: TrendDirection;
  };
  
  topIssues: Array<{
    issue: string;
    count: number;
  }>;
}

interface ReportParams {
  dateRange: DateRange;
  metrics: string[];
  groupBy?: string;
  filters?: Record<string, any>;
}

interface CustomReport {
  params: ReportParams;
  data: any;
  generatedAt: Timestamp;
}

interface Alert {
  alertId: UUID;
  severity: "info" | "warning" | "error" | "critical";
  metric: string;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Timestamp;
}
```

### 11.7 INotificationService (упрощённый)

Для уведомления менеджеров о handoff.

```typescript
interface INotificationService {
  // Отправка уведомлений
  sendNotification(notification: Notification): Promise<OperationResult<void>>;
  
  // Отправка через определённый канал
  sendViaChannel(
    channel: NotificationChannel,
    recipient: string,
    message: string
  ): Promise<OperationResult<void>>;
  
  // Проверка доступности каналов
  checkChannel(channel: NotificationChannel): Promise<OperationResult<boolean>>;
}

interface Notification {
  recipient: string;
  subject?: string;
  message: string;
  
  priority: NotificationPriority;
  
  channels: NotificationChannel[];
  
  metadata?: Record<string, any>;
}

enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}
```

### 11.8 IScheduler (упрощённый)

Для планирования задач (например, очистка старых данных).

```typescript
interface IScheduler {
  // Планирование разовой задачи
  scheduleTask(task: ScheduledTask): Promise<OperationResult<string>>;
  
  // Планирование повторяющейся задачи
  scheduleRecurringTask(task: RecurringTask): Promise<OperationResult<string>>;
  
  // Отмена
  cancelTask(taskId: string): Promise<OperationResult<void>>;
  
  // Информация
  getTask(taskId: string): Promise<OperationResult<TaskInfo>>;
  listTasks(): Promise<OperationResult<TaskInfo[]>>;
}

interface ScheduledTask {
  name: string;
  handler: () => Promise<void>;
  scheduledFor: Timestamp;
  metadata?: Record<string, any>;
}

interface RecurringTask {
  name: string;
  handler: () => Promise<void>;
  schedule: string; // cron expression
  metadata?: Record<string, any>;
}

interface TaskInfo {
  taskId: string;
  name: string;
  status: "scheduled" | "running" | "completed" | "failed";
  nextRun?: Timestamp;
  lastRun?: Timestamp;
}
```

## 12. Orchestrator - Упрощённый оркестратор

### 12.1 ISimplifiedOrchestrator

```typescript
interface ISimplifiedOrchestrator {
  // Инициализация
  start(config: OrchestratorConfig): Promise<OperationResult<void>>;
  stop(): Promise<OperationResult<void>>;
  
  // Обработка сообщений
  handleIncomingMessage(message: UniversalMessage): Promise<OperationResult<void>>;
  
  // Управление режимами
  isHumanMode(conversationId: string): Promise<OperationResult<boolean>>;
  switchToHumanMode(conversationId: string, reason: HandoffReason): Promise<OperationResult<void>>;
  switchToAIMode(conversationId: string): Promise<OperationResult<void>>;
  
  // Сессии
  getSession(conversationId: string): Promise<OperationResult<Session>>;
  updateSession(conversationId: string, updates: Partial<Session>): Promise<OperationResult<void>>;
  closeSession(conversationId: string): Promise<OperationResult<void>>;
  
  // Здоровье системы
  getHealth(): Promise<OperationResult<SystemHealth>>;
  
  // Статистика
  getMetrics(): Promise<OperationResult<SystemMetrics>>;
}

interface OrchestratorConfig {
  // Адаптеры
  adapters: AdapterConfig[];
  
  // Компоненты
  aiEngine: AIEngineConfig;
  knowledgeBase: string; // путь к файлам
  personality: PersonalityProfile;
  
  // Детекция
  situationDetection: DetectionThresholds;
  
  // Handoff
  handoff: HandoffConfig;
  
  // Лимиты
  limits: {
    maxMessageLength: number;
    maxConversationDuration: number; // seconds
    maxInactiveTime: number; // seconds
  };
  
  metadata?: Record<string, any>;
}

interface Session {
  sessionId: UUID;
  conversationId: string;
  userId: string;
  platform: PlatformType;
  
  mode: ConversationMode;
  
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
  expiresAt: Timestamp;
  
  metadata?: Record<string, any>;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  
  components: {
    orchestrator: ComponentHealth;
    aiEngine: ComponentHealth;
    knowledgeBase: ComponentHealth;
    dataLayer: ComponentHealth;
    adapters: Record<PlatformType, ComponentHealth>;
  };
  
  timestamp: Timestamp;
}

interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latency?: number;
  errorRate?: number;
  lastCheck: Timestamp;
  message?: string;
}

interface SystemMetrics {
  timestamp: Timestamp;
  
  // Общее
  activeConversations: number;
  activeSessions: number;
  
  // Сообщения
  messagesProcessed: number;
  averageResponseTime: number;
  
  // AI
  aiRequests: number;
  aiAverageLatency: number;
  aiErrorRate: number;
  
  // Handoffs
  activeHandoffs: number;
  handoffRate: number;
  
  // По платформам
  byPlatform: Record<PlatformType, PlatformMetrics>;
}

interface PlatformMetrics {
  activeConversations: number;
  messagesReceived: number;
  messagesSent: number;
  averageResponseTime: number;
}
```

## 13. Заключение

Это завершает документацию **Simplified Module Interfaces** для AI-агента первой линии.

### Что покрыто в обеих частях:

**Часть 1:**
- ✅ Presentation Layer (Messenger Adapters)
- ✅ Context Manager
- ✅ Situation Detector
- ✅ Human Mimicry
- ✅ Handoff System
- ✅ Knowledge Base (ПНД)

**Часть 2:**
- ✅ AI Engine (упрощённый)
- ✅ Data Layer (все репозитории)
- ✅ Utility Interfaces (Logger, EventBus, Cache, Config, Metrics, etc.)
- ✅ Orchestrator (упрощённый)

### Ключевые особенности:

1. **Полная типизация** - все интерфейсы с TypeScript
2. **Модульность** - каждый компонент независим
3. **Расширяемость** - легко добавлять новые функции
4. **Асинхронность** - все операции через Promise
5. **Обработка ошибок** - через OperationResult<T>
6. **Метаданные** - везде есть поля для расширения

### Отличия от полной версии:

- ❌ Убраны сложные интеграции (CRM, платежи, календари)
- ❌ Убрана автоматизация действий
- ✅ Добавлен фокус на человечность (Human Mimicry)
- ✅ Добавлен детальный Handoff System
- ✅ Упрощён AI Engine (только генерация ответов)
- ✅ Минимальный Data Layer (только необходимое)
