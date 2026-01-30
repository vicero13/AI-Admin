import {
  Conversation,
  ContextMessage,
  ClientProfile,
  Handoff,
  ConversationContext,
  PlatformType,
  ClientType,
  EmotionalState,
  ConversationMode,
  MessageRole,
  MessageHandler,
  HandoffStatus,
  HandoffPriority,
  HandoffReasonType,
  RiskLevel,
} from '../../src/types';

export function createTestConversation(overrides?: Partial<Conversation>): Conversation {
  const now = Date.now();
  return {
    conversationId: 'conv-test-001',
    userId: 'user-test-001',
    platform: PlatformType.TELEGRAM,
    context: createTestContext(),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    active: true,
    mode: ConversationMode.AI,
    metadata: {},
    ...overrides,
  };
}

export function createTestMessage(overrides?: Partial<ContextMessage>): ContextMessage {
  return {
    messageId: 'msg-test-001',
    timestamp: Date.now(),
    role: MessageRole.USER,
    content: 'Test message content',
    handledBy: MessageHandler.AI,
    ...overrides,
  };
}

export function createTestClient(overrides?: Partial<ClientProfile>): ClientProfile {
  const now = Date.now();
  return {
    userId: 'user-test-001',
    platform: PlatformType.TELEGRAM,
    name: 'Test User',
    firstContact: now,
    lastContact: now,
    totalConversations: 1,
    totalMessages: 0,
    type: ClientType.NEW,
    tags: [],
    previousTopics: [],
    metadata: {},
    ...overrides,
  };
}

export function createTestHandoff(overrides?: Partial<Handoff>): Handoff {
  const now = Date.now();
  return {
    handoffId: 'handoff-test-001',
    conversationId: 'conv-test-001',
    userId: 'user-test-001',
    reason: {
      type: HandoffReasonType.COMPLEX_QUERY,
      description: 'Test handoff reason',
      severity: RiskLevel.MEDIUM,
      detectedBy: 'test',
    },
    context: createTestContext(),
    initiatedAt: now,
    status: HandoffStatus.PENDING,
    priority: HandoffPriority.NORMAL,
    metadata: {},
    ...overrides,
  };
}

export function createTestContext(overrides?: Partial<ConversationContext>): ConversationContext {
  const now = Date.now();
  return {
    conversationId: 'conv-test-001',
    userId: 'user-test-001',
    platform: PlatformType.TELEGRAM,
    sessionStarted: now,
    lastActivity: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    clientType: ClientType.NEW,
    messageHistory: [],
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
    ...overrides,
  };
}
