import { Orchestrator, OrchestratorConfig, OrchestratorDeps } from '../../../src/core/orchestrator';
import {
  ConversationMode,
  PlatformType,
  MessageType,
  MessageRole,
  MessageHandler,
  EmotionalState,
  HandoffReasonType,
  RiskLevel,
  UrgencyLevel,
  AIProvider,
  CommunicationStyle,
  EmojiUsage,
  PunctuationStyle,
  VocabularyLevel,
  EmpathyLevel,
  FormalityLevel,
  NotificationChannel,
  UniversalMessage,
} from '../../../src/types';
import { createTestContext } from '../../fixtures/test-data';

// Mock Logger
jest.mock('../../../src/utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

function createMockDeps(): OrchestratorDeps {
  const context = createTestContext();

  return {
    contextManager: {
      createContext: jest.fn().mockReturnValue(context),
      getContext: jest.fn().mockReturnValue(context),
      updateContext: jest.fn().mockReturnValue(context),
      addMessage: jest.fn(),
      identifyClient: jest.fn(),
      expireOldContexts: jest.fn(),
      getHistory: jest.fn().mockReturnValue([]),
      clearHistory: jest.fn(),
      getClientProfile: jest.fn(),
      updateClientProfile: jest.fn(),
      setCurrentTopic: jest.fn(),
      setEmotionalState: jest.fn(),
      setSuspectAI: jest.fn(),
      setComplexQuery: jest.fn(),
      clearContext: jest.fn(),
    } as any,

    situationDetector: {
      analyze: jest.fn().mockReturnValue({
        timestamp: Date.now(),
        conversationId: 'conv-1',
        messageId: 'msg-1',
        aiProbing: {
          detected: false,
          confidence: 0,
          indicators: [],
          probingType: 'behavioral',
          detectedPatterns: [],
          recommendation: 'answer_naturally',
        },
        complexity: {
          score: 10,
          factors: {
            outOfScope: false,
            requiresCalculation: false,
            needsExternalData: false,
            ambiguous: false,
            multiStep: false,
            requiresPersonalization: false,
          },
          recommendation: 'answer',
          missingInformation: [],
        },
        emotionalState: {
          state: EmotionalState.NEUTRAL,
          confidence: 0.8,
          indicators: [],
          changeFromPrevious: 'stable',
          escalationRisk: 'low',
        },
        confidence: {
          score: 75,
          factors: {
            knowledgeBaseMatch: 0.8,
            responseClarity: 0.7,
            potentialHallucination: 0.1,
            contextRelevance: 0.6,
          },
          recommendation: 'send',
        },
        overallRisk: 'low',
        requiresHandoff: false,
        urgency: 'low',
        recommendations: ['Standard response'],
      }),
    } as any,

    humanMimicry: {
      makeNatural: jest.fn().mockImplementation(async (text: string) => text),
      addHumanTouch: jest.fn().mockImplementation(async (text: string) => text),
      applyPersonality: jest.fn().mockImplementation(async (text: string) => text),
      checkRoboticness: jest.fn().mockReturnValue({
        score: 20,
        flags: {
          tooFormal: false,
          tooPerfect: false,
          repetitiveStructure: false,
          unnaturalPhrasing: false,
          noPersonality: false,
          instantResponse: false,
          noEmotionalCues: false,
          overexplanation: false,
        },
        suggestions: [],
        examples: [],
      }),
      calculateTypingDelay: jest.fn().mockReturnValue(1500),
      adaptToClientStyle: jest.fn().mockImplementation(async (text: string) => text),
      generateVariations: jest.fn().mockResolvedValue([]),
      setPersonality: jest.fn(),
      getPersonality: jest.fn(),
    } as any,

    handoffSystem: {
      initiateHandoff: jest.fn().mockResolvedValue({
        success: true,
        handoffId: 'ho-1',
        stallingMessage: 'Please wait, connecting you to a manager.',
        notificationsSent: 1,
      }),
      isHumanMode: jest.fn().mockReturnValue(false),
      setAIMode: jest.fn(),
    } as any,

    aiEngine: {
      initialize: jest.fn(),
      generateResponse: jest.fn().mockResolvedValue({
        text: 'AI response',
        metadata: { provider: 'anthropic', model: 'claude-3', tokensUsed: 100, latency: 500, finishReason: 'stop', cached: false, timestamp: Date.now() },
      }),
      generateHumanLikeResponse: jest.fn().mockResolvedValue({
        text: 'Human-like AI response',
        confidence: 0.85,
        requiresHandoff: false,
        typingDelay: 1500,
        pauseBeforeSend: 500,
        usedKnowledge: [],
      }),
      buildSystemPrompt: jest.fn().mockReturnValue('system prompt'),
      analyzeIntent: jest.fn().mockResolvedValue({
        primaryIntent: 'general_question',
        confidence: 0.9,
        entities: [],
      }),
    } as any,

    knowledgeBase: {
      search: jest.fn().mockResolvedValue([]),
      load: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn(),
      getAllItems: jest.fn().mockReturnValue([]),
    } as any,
  };
}

function createTestConfig(): OrchestratorConfig {
  return {
    aiEngine: {
      provider: AIProvider.ANTHROPIC,
      model: 'claude-3-haiku',
      temperature: 0.7,
      maxTokens: 1024,
      systemPrompt: 'Test',
      cacheEnabled: false,
    },
    personality: {
      name: 'TestBot',
      role: 'Admin',
      style: CommunicationStyle.FRIENDLY,
      traits: {
        emojiUsage: EmojiUsage.MODERATE,
        emojiFrequency: 0.5,
        preferredEmojis: ['😊'],
        punctuation: PunctuationStyle.CASUAL,
        vocabulary: VocabularyLevel.MODERATE,
        empathy: EmpathyLevel.HIGH,
        enthusiasm: 'moderate',
        usesHumor: false,
        formalityLevel: FormalityLevel.CASUAL,
      },
      patterns: {
        greetings: ['Hi!'],
        farewells: ['Bye!'],
        acknowledgments: ['OK!'],
        delays: ['Wait...'],
        apologies: ['Sorry!'],
        transitions: ['BTW,'],
        fillers: ['well'],
        preferredPhrases: ['Happy to help!'],
      },
      restrictions: {
        avoidWords: [],
        avoidTopics: [],
        maxMessageLength: 500,
        avoidStyles: [],
      },
    },
    situationDetection: {
      aiProbing: { minConfidence: 0.3, handoffThreshold: 0.8 },
      complexity: { maxScore: 100, handoffThreshold: 60 },
      emotional: { escalationThreshold: 0.3, handoffStates: [EmotionalState.ANGRY] },
      confidence: { minScore: 60, handoffThreshold: 30 },
    },
    handoff: {
      autoHandoffTriggers: [HandoffReasonType.AI_PROBING],
      notificationChannels: [NotificationChannel.TELEGRAM],
      stallingMessages: ['Please wait...'],
      customStallingMessages: {},
      estimatedWaitTime: 60,
      maxWaitBeforeEscalation: 300,
    },
    knowledgeBasePath: '/tmp/test-kb',
    limits: {
      maxMessageLength: 1000,
      maxConversationDuration: 3600,
      maxInactiveTime: 1800,
    },
  };
}

function createTestMessage(text: string): UniversalMessage {
  return {
    messageId: 'msg-test-001',
    conversationId: 'conv-test-001',
    userId: 'user-test-001',
    timestamp: Date.now(),
    platform: PlatformType.TELEGRAM,
    platformMessageId: 'plat-001',
    content: {
      type: MessageType.TEXT,
      text,
    },
    metadata: {},
  };
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let deps: OrchestratorDeps;
  let config: OrchestratorConfig;

  beforeEach(() => {
    deps = createMockDeps();
    config = createTestConfig();
    orchestrator = new Orchestrator(config, deps);
  });

  describe('start/stop lifecycle', () => {
    it('starts without error', async () => {
      await expect(orchestrator.start()).resolves.not.toThrow();
    });

    it('stops without error', async () => {
      await orchestrator.start();
      await expect(orchestrator.stop()).resolves.not.toThrow();
    });

    it('returns null for messages when not running', async () => {
      const message = createTestMessage('Hello');
      const result = await orchestrator.handleIncomingMessage(message);
      expect(result).toBeNull();
    });
  });

  describe('handleIncomingMessage in AI mode', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    it('returns a response for a text message', async () => {
      const message = createTestMessage('Какие у вас услуги?');
      const result = await orchestrator.handleIncomingMessage(message);

      expect(result).not.toBeNull();
      expect(result!.responseText).toBeDefined();
      expect(typeof result!.responseText).toBe('string');
      expect(result!.typingDelay).toBeDefined();
      expect(typeof result!.typingDelay).toBe('number');
    });

    it('calls contextManager.getContext', async () => {
      const message = createTestMessage('Hello');
      await orchestrator.handleIncomingMessage(message);

      expect(deps.contextManager.getContext).toHaveBeenCalled();
    });

    it('calls situationDetector.analyze', async () => {
      const message = createTestMessage('Hello');
      await orchestrator.handleIncomingMessage(message);

      expect(deps.situationDetector.analyze).toHaveBeenCalled();
    });

    it('calls aiEngine.generateHumanLikeResponse', async () => {
      const message = createTestMessage('Hello');
      await orchestrator.handleIncomingMessage(message);

      expect(deps.aiEngine.generateHumanLikeResponse).toHaveBeenCalled();
    });

    it('calls humanMimicry.makeNatural on the response', async () => {
      const message = createTestMessage('Hello');
      await orchestrator.handleIncomingMessage(message);

      expect(deps.humanMimicry.makeNatural).toHaveBeenCalled();
    });

    it('returns null for empty text messages', async () => {
      const message = createTestMessage('');
      message.content.text = '';
      const result = await orchestrator.handleIncomingMessage(message);
      expect(result).toBeNull();
    });

    it('returns null for messages with only whitespace', async () => {
      const message = createTestMessage('   ');
      const result = await orchestrator.handleIncomingMessage(message);
      expect(result).toBeNull();
    });
  });

  describe('handleIncomingMessage in human mode', () => {
    it('returns null when conversation is in HUMAN mode', async () => {
      await orchestrator.start();

      const humanContext = createTestContext({ mode: ConversationMode.HUMAN });
      (deps.contextManager.getContext as jest.Mock).mockReturnValue(humanContext);

      const message = createTestMessage('I need help');
      const result = await orchestrator.handleIncomingMessage(message);

      expect(result).toBeNull();
    });

    it('still saves the message to history in HUMAN mode', async () => {
      await orchestrator.start();

      const humanContext = createTestContext({ mode: ConversationMode.HUMAN });
      (deps.contextManager.getContext as jest.Mock).mockReturnValue(humanContext);

      const message = createTestMessage('I need help');
      await orchestrator.handleIncomingMessage(message);

      expect(deps.contextManager.addMessage).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('returns running=false before start', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.running).toBe(false);
    });

    it('returns running=true after start', async () => {
      await orchestrator.start();
      const metrics = orchestrator.getMetrics();
      expect(metrics.running).toBe(true);
    });

    it('returns running=false after stop', async () => {
      await orchestrator.start();
      await orchestrator.stop();
      const metrics = orchestrator.getMetrics();
      expect(metrics.running).toBe(false);
    });
  });

  describe('isHumanMode', () => {
    it('delegates to handoffSystem', () => {
      orchestrator.isHumanMode('conv-1');
      expect(deps.handoffSystem.isHumanMode).toHaveBeenCalledWith('conv-1');
    });

    it('returns false by default', () => {
      const result = orchestrator.isHumanMode('conv-1');
      expect(result).toBe(false);
    });

    it('returns true when handoff system says so', () => {
      (deps.handoffSystem.isHumanMode as jest.Mock).mockReturnValue(true);
      const result = orchestrator.isHumanMode('conv-1');
      expect(result).toBe(true);
    });
  });

  describe('handoff flow', () => {
    it('triggers handoff when situation analysis requires it', async () => {
      await orchestrator.start();

      (deps.situationDetector.analyze as jest.Mock).mockReturnValue({
        timestamp: Date.now(),
        conversationId: 'conv-1',
        messageId: 'msg-1',
        aiProbing: { detected: true, confidence: 0.95, indicators: [], probingType: 'direct', detectedPatterns: ['ты бот'], recommendation: 'handoff' },
        complexity: { score: 10, factors: {}, recommendation: 'answer', missingInformation: [] },
        emotionalState: { state: EmotionalState.NEUTRAL, confidence: 0.8, indicators: [], escalationRisk: 'low' },
        confidence: { score: 75, factors: {}, recommendation: 'send' },
        overallRisk: 'medium',
        requiresHandoff: true,
        handoffReason: {
          type: HandoffReasonType.AI_PROBING,
          description: 'AI probing detected',
          severity: RiskLevel.HIGH,
          detectedBy: 'test',
        },
        urgency: 'high',
        recommendations: [],
      });

      const message = createTestMessage('Ты бот?');
      const result = await orchestrator.handleIncomingMessage(message);

      expect(deps.handoffSystem.initiateHandoff).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result!.responseText).toContain('wait');
    });
  });
});
