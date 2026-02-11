// ============================================================
// Base Types - Базовые типы AI-агента первой линии поддержки
// ============================================================

export type UUID = string;
export type Timestamp = number; // Unix timestamp в миллисекундах

// --- Enums ---

export enum Language {
  RU = 'ru',
  EN = 'en',
  ES = 'es',
  DE = 'de',
}

export enum PlatformType {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  VK = 'vk',
  WEB = 'web',
}

export enum Status {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum ClientType {
  NEW = 'new',
  RETURNING = 'returning',
  VIP = 'vip',
  PROBLEMATIC = 'problematic',
}

export enum CommunicationStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  VOICE = 'voice',
  DOCUMENT = 'document',
  STICKER = 'sticker',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  MANAGER = 'manager',
  SYSTEM = 'system',
}

export enum MessageHandler {
  AI = 'ai',
  HUMAN = 'human',
  SYSTEM = 'system',
}

export enum EmotionalState {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  FRUSTRATED = 'frustrated',
  ANGRY = 'angry',
  CONFUSED = 'confused',
}

export enum ConversationMode {
  AI = 'ai',
  HUMAN = 'human',
  TRANSITIONING = 'transitioning',
}

export enum ProbingType {
  DIRECT = 'direct',
  INDIRECT = 'indirect',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
}

export enum HandoffReasonType {
  AI_PROBING = 'ai_probing',
  COMPLEX_QUERY = 'complex_query',
  EMOTIONAL_ESCALATION = 'emotional_escalation',
  LOW_CONFIDENCE = 'low_confidence',
  SPECIAL_REQUEST = 'special_request',
  OUT_OF_SCOPE = 'out_of_scope',
  TECHNICAL_ISSUE = 'technical_issue',
  MANUAL_REQUEST = 'manual_request',
  MEDIA_REQUEST = 'media_request',
  PROFANITY = 'profanity',
}

export enum HandoffStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export enum HandoffPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum KnowledgeType {
  BUSINESS_INFO = 'business_info',
  SERVICE = 'service',
  FAQ = 'faq',
  POLICY = 'policy',
  DIALOG_EXAMPLE = 'dialog_example',
  PROCEDURE = 'procedure',
  TEAM_MEMBER = 'team_member',
}

export enum KnowledgeCategory {
  GENERAL = 'general',
  PRICING = 'pricing',
  BOOKING = 'booking',
  SERVICES = 'services',
  POLICIES = 'policies',
  LOCATION = 'location',
  TEAM = 'team',
  TECHNICAL = 'technical',
  OTHER = 'other',
}

export enum EmojiUsage {
  NONE = 'none',
  RARE = 'rare',
  MODERATE = 'moderate',
  FREQUENT = 'frequent',
}

export enum PunctuationStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  MINIMAL = 'minimal',
}

export enum VocabularyLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  ADVANCED = 'advanced',
}

export enum EmpathyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum FormalityLevel {
  VERY_FORMAL = 'very_formal',
  FORMAL = 'formal',
  NEUTRAL = 'neutral',
  CASUAL = 'casual',
  VERY_CASUAL = 'very_casual',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  // LOCAL = 'local',
}

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  SLACK = 'slack',
}

// --- Interfaces ---

export interface OperationResult<T> {
  status: Status;
  data?: T;
  error?: ErrorInfo;
  timestamp: Timestamp;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  context?: Record<string, unknown>;
}

// --- Messages ---

export interface UniversalMessage {
  messageId: UUID;
  conversationId: string;
  userId: string;
  timestamp: Timestamp;
  platform: PlatformType;
  platformMessageId: string;
  content: MessageContent;
  metadata: MessageMetadata;
}

export interface MessageContent {
  type: MessageType;
  text?: string;
  media?: MediaInfo[];
}

export interface MediaInfo {
  id: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'document';
  url?: string;
  mimeType?: string;
  caption?: string;
}

export interface MessageMetadata {
  language?: Language;
  tags?: string[];
  custom?: Record<string, unknown>;
}

export interface MessageSendResult {
  messageId: string;
  platformMessageId: string;
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'failed';
}

export interface UserInfo {
  userId: string;
  platform: PlatformType;
  platformUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  language?: Language;
  metadata?: Record<string, unknown>;
}

// --- Context ---

export interface ConversationContext {
  conversationId: string;
  userId: string;
  platform: PlatformType;
  sessionStarted: Timestamp;
  lastActivity: Timestamp;
  expiresAt: Timestamp;
  clientType: ClientType;
  clientProfile?: ClientProfile;
  messageHistory: ContextMessage[];
  currentTopic?: string;
  emotionalState: EmotionalState;
  suspectAI: boolean;
  complexQuery: boolean;
  requiresHandoff: boolean;
  mode: ConversationMode;
  metadata: Record<string, unknown>;
}

export interface ContextMessage {
  messageId: string;
  timestamp: Timestamp;
  role: MessageRole;
  content: string;
  intent?: string;
  emotion?: string;
  confidence?: number;
  handledBy: MessageHandler;
  metadata?: Record<string, unknown>;
}

export interface ClientProfile {
  userId: string;
  platform: PlatformType;
  name?: string;
  phoneNumber?: string;
  email?: string;
  firstContact: Timestamp;
  lastContact: Timestamp;
  totalConversations: number;
  totalMessages: number;
  type: ClientType;
  preferredLanguage?: Language;
  communicationStyle?: CommunicationStyle;
  tags: string[];
  previousTopics: string[];
  notes?: string[];
  metadata: Record<string, unknown>;
}

// --- Situation Detection ---

export interface SituationAnalysis {
  timestamp: Timestamp;
  conversationId: string;
  messageId: string;
  aiProbing: AIProbeDetection;
  complexity: ComplexityScore;
  emotionalState: EmotionalStateDetection;
  confidence: ConfidenceScore;
  overallRisk: RiskLevel;
  requiresHandoff: boolean;
  handoffReason?: HandoffReason;
  urgency: UrgencyLevel;
  recommendations: string[];
  promptInjection?: { detected: boolean; confidence: number; patterns: string[] };
  mediaRequest?: { detected: boolean; keywords: string[] };
  profanity?: { detected: boolean; words: string[] };
  metadata?: Record<string, unknown>;
}

export interface AIProbeDetection {
  detected: boolean;
  confidence: number;
  indicators: AIProbeIndicator[];
  probingType: ProbingType;
  detectedPatterns: string[];
  recommendation: 'answer_naturally' | 'deflect' | 'handoff';
}

export interface AIProbeIndicator {
  type: string;
  text: string;
  confidence: number;
}

export interface ComplexityScore {
  score: number;
  factors: ComplexityFactors;
  recommendation: 'answer' | 'clarify' | 'handoff';
  missingInformation: string[];
}

export interface ComplexityFactors {
  outOfScope: boolean;
  requiresCalculation: boolean;
  needsExternalData: boolean;
  ambiguous: boolean;
  multiStep: boolean;
  requiresPersonalization: boolean;
}

export interface EmotionalStateDetection {
  state: EmotionalState;
  confidence: number;
  indicators: EmotionalIndicator[];
  changeFromPrevious?: 'escalated' | 'stable' | 'improved';
  escalationRisk: RiskLevel;
}

export interface EmotionalIndicator {
  type: string;
  evidence: string;
  weight: number;
}

export interface ConfidenceScore {
  score: number;
  factors: ConfidenceFactors;
  recommendation: 'send' | 'review' | 'handoff';
}

export interface ConfidenceFactors {
  knowledgeBaseMatch: number;
  responseClarity: number;
  potentialHallucination: number;
  contextRelevance: number;
}

// --- Handoff ---

export interface HandoffReason {
  type: HandoffReasonType;
  description: string;
  severity: RiskLevel;
  detectedBy: string;
}

export interface Handoff {
  handoffId: UUID;
  conversationId: string;
  userId: string;
  reason: HandoffReason;
  context: ConversationContext;
  initiatedAt: Timestamp;
  notifiedAt?: Timestamp;
  acceptedAt?: Timestamp;
  resolvedAt?: Timestamp;
  assignedTo?: string;
  acceptedBy?: string;
  status: HandoffStatus;
  priority: HandoffPriority;
  resolution?: HandoffResolution;
  metadata: Record<string, unknown>;
}

export interface HandoffResult {
  success: boolean;
  handoffId: string;
  stallingMessage: string;
  estimatedWaitTime?: number;
  notificationsSent: number;
  metadata?: Record<string, unknown>;
}

export interface HandoffPackage {
  handoff: Handoff;
  client: ClientProfile;
  conversationHistory: ContextMessage[];
  context: ConversationContext;
  situationAnalysis: SituationAnalysis;
  recommendations: ManagerRecommendation[];
  urgentNotes: string[];
  relevantKnowledge: KnowledgeItem[];
  suggestedResponses?: string[];
  metadata?: Record<string, unknown>;
}

export interface ManagerRecommendation {
  type: 'tone' | 'information' | 'action' | 'warning';
  description: string;
  priority: number;
}

export interface HandoffResolution {
  status: 'resolved_successfully' | 'resolved_with_issues' | 'escalated' | 'closed_no_response';
  summary: string;
  returnToAI: boolean;
  metadata?: Record<string, unknown>;
}

export interface HandoffStats {
  period: DateRange;
  total: number;
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  byPriority: Record<string, number>;
  averageResponseTime: number;
  averageResolutionTime: number;
  resolvedSuccessfully: number;
  returnedToAI: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// --- Knowledge Base ---

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  category: KnowledgeCategory;
  content: unknown;
  title: string;
  description?: string;
  tags: string[];
  keywords: string[];
  alternativeQuestions?: string[];
  confidence: number;
  lastVerified: Timestamp;
  usageCount: number;
  lastUsed?: Timestamp;
  metadata: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  relevance: number;
  matchedTerms: string[];
  snippet: string;
}

export interface BusinessLocationEntry {
  id: string;
  name: string;
  shortName?: string;
  subtitle?: string;
  metro?: string;
  metroLine?: string;
  address: string;
  description?: string;
  features?: string[];
  nearby?: string[];
  pricePerSeat?: number;
  websiteUrl?: string;
  matterportTour?: string;
}

export interface IncludedInPrice {
  items: { title: string; description: string }[];
}

export interface BusinessInfo {
  name: string;
  type: string;
  description: string;
  tagline?: string;
  contacts: BusinessContacts;
  locations: BusinessLocationEntry[];
  includedInPrice?: IncludedInPrice;
  contractTerms?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  yandexMaps?: string;
  app?: string;
  // Legacy fields (backward compat)
  location?: BusinessLocation;
  workingHours?: WorkingHours;
  amenities?: string[];
  features?: string[];
  rules?: string[];
  team?: TeamMember[];
  socialMedia?: SocialMedia;
  metadata?: Record<string, unknown>;
}

export interface BusinessContacts {
  phone: string;
  email: string;
  website?: string;
  whatsapp?: string;
  telegram?: string;
}

export interface BusinessLocation {
  address: string;
  city: string;
  coordinates?: { lat: number; lon: number };
  directions?: string;
  nearestMetro?: string;
  parking?: string;
}

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  holidays: Holiday[];
  timezone: string;
}

export interface DaySchedule {
  open: string;
  close: string;
  breaks?: Array<{ start: string; end: string }>;
  note?: string;
}

export interface Holiday {
  date: string;
  name: string;
  open: boolean;
  specialHours?: DaySchedule;
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  specialization?: string[];
}

export interface SocialMedia {
  instagram?: string;
  vk?: string;
  facebook?: string;
  youtube?: string;
}

export interface ServiceInfo {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  pricing: ServicePricing[];
  available: boolean;
  availabilityNote?: string;
  features: string[];
  popular: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface ServicePricing {
  amount: number;
  currency: string;
  unit: string;
  conditions?: string;
}

export interface FAQItem {
  faqId: string;
  question: string;
  answer: string;
  category: KnowledgeCategory;
  alternativeQuestions: string[];
  relatedQuestions: string[];
  popularity: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Policy {
  policyId: string;
  name: string;
  type: string;
  content: string;
  summary: string;
  keyPoints: string[];
  lastUpdated: Timestamp;
  metadata: Record<string, unknown>;
}

export interface DialogExample {
  exampleId: string;
  situation: string;
  clientType: ClientType;
  messages: DialogMessage[];
  outcome: 'successful' | 'escalated' | 'negative' | 'neutral';
  quality: number;
  learnings: string[];
  keyPhrases: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface DialogMessage {
  role: 'client' | 'manager';
  text: string;
  intent?: string;
  emotion?: string;
  note?: string;
}

// --- Personality ---

export interface PersonalityProfile {
  name: string;
  role: string;
  style: CommunicationStyle;
  traits: PersonalityTraits;
  patterns: SpeechPatterns;
  restrictions: PersonalityRestrictions;
  metadata?: Record<string, unknown>;
}

export interface PersonalityTraits {
  emojiUsage: EmojiUsage;
  emojiFrequency: number;
  preferredEmojis: string[];
  punctuation: PunctuationStyle;
  vocabulary: VocabularyLevel;
  empathy: EmpathyLevel;
  enthusiasm: 'reserved' | 'moderate' | 'energetic';
  usesHumor: boolean;
  formalityLevel: FormalityLevel;
}

export interface SpeechPatterns {
  greetings: string[];
  farewells: string[];
  acknowledgments: string[];
  delays: string[];
  apologies: string[];
  transitions: string[];
  fillers: string[];
  preferredPhrases: string[];
}

export interface PersonalityRestrictions {
  avoidWords: string[];
  avoidTopics: string[];
  maxMessageLength: number;
  avoidStyles: string[];
}

// --- AI Engine ---

export interface AIRetryConfig {
  maxAttempts: number;
  requestTimeoutMs: number;
  delayBetweenRetriesMs: number;
  stallingMessages: string[];
}

export interface AIEngineConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  fallbackProvider?: AIProvider;
  fallbackModel?: string;
  systemPrompt: string;
  cacheEnabled: boolean;
  cacheTTL?: number;
  retry?: AIRetryConfig;
  metadata?: Record<string, unknown>;
}

export interface AIRequest {
  message: string;
  context: ConversationContext;
  relevantKnowledge: KnowledgeItem[];
  personality: PersonalityProfile;
  parameters?: AIParameters;
  systemPrompt?: string;
  additionalInstructions?: string[];
  metadata?: Record<string, unknown>;
}

export interface AIParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface AIResponse {
  text: string;
  metadata: AIResponseMetadata;
  analysis?: ResponseAnalysis;
  alternatives?: string[];
}

export interface AIResponseMetadata {
  provider: string;
  model: string;
  tokensUsed: number;
  latency: number;
  confidence?: number;
  finishReason: 'stop' | 'length' | 'error';
  cached: boolean;
  timestamp: Timestamp;
}

export interface ResponseAnalysis {
  containsQuestion: boolean;
  containsInstruction: boolean;
  emotionalTone: string;
  possibleHallucination: boolean;
  offTopic: boolean;
  tooRobotic: boolean;
  needsImprovement: boolean;
  suggestions?: string[];
}

export interface HumanLikeResponse {
  text: string;
  confidence: number;
  requiresHandoff: boolean;
  handoffReason?: HandoffReason;
  typingDelay: number;
  pauseBeforeSend: number;
  usedKnowledge: string[];
  detectedIntent?: string;
  suggestedFollowUp?: string[];
  metadata?: Record<string, unknown>;
}

// --- Conversation ---

export interface Conversation {
  conversationId: UUID;
  userId: string;
  platform: PlatformType;
  context: ConversationContext;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  closedAt?: Timestamp;
  active: boolean;
  mode: ConversationMode;
  metadata: Record<string, unknown>;
}

// --- Config ---

export interface AppConfig {
  server: { port: number; host: string };
  ai: AIEngineConfig;
  telegram: { token: string };
  handoff: HandoffConfig;
  personality: PersonalityProfile;
  situationDetection: DetectionThresholds;
  knowledgeBasePath: string;
  logging: { level: LogLevel };
}

export interface HandoffConfig {
  autoHandoffTriggers: HandoffReasonType[];
  notificationChannels: NotificationChannel[];
  stallingMessages: string[];
  customStallingMessages: Partial<Record<HandoffReasonType, string[]>>;
  estimatedWaitTime: number;
  maxWaitBeforeEscalation: number;
  metadata?: Record<string, unknown>;
}

export interface DetectionThresholds {
  aiProbing: {
    minConfidence: number;
    handoffThreshold: number;
  };
  complexity: {
    maxScore: number;
    handoffThreshold: number;
  };
  emotional: {
    escalationThreshold: number;
    handoffStates: EmotionalState[];
  };
  confidence: {
    minScore: number;
    handoffThreshold: number;
  };
}

// --- Log ---

export interface LogEntry {
  logId: UUID;
  timestamp: Timestamp;
  level: LogLevel;
  component: string;
  message: string;
  details?: string;
  conversationId?: string;
  userId?: string;
  handoffId?: string;
  stackTrace?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

// --- Roboticness ---

export interface RoboticnessScore {
  score: number;
  flags: RoboticnessFlags;
  suggestions: string[];
  examples: string[];
}

export interface RoboticnessFlags {
  tooFormal: boolean;
  tooPerfect: boolean;
  repetitiveStructure: boolean;
  unnaturalPhrasing: boolean;
  noPersonality: boolean;
  instantResponse: boolean;
  noEmotionalCues: boolean;
  overexplanation: boolean;
}
