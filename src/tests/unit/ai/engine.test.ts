import { AIEngine } from '../../../src/ai/engine';
import {
  AIProvider,
  CommunicationStyle,
  EmojiUsage,
  PunctuationStyle,
  VocabularyLevel,
  EmpathyLevel,
  FormalityLevel,
  PersonalityProfile,
  AIEngineConfig,
} from '../../../src/types';

// Mock the Anthropic provider module
jest.mock('../../../src/ai/providers/anthropic', () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      text: 'Mocked AI response text',
      tokensUsed: 150,
      finishReason: 'stop',
    }),
  })),
}));

function createTestConfig(): AIEngineConfig {
  return {
    provider: AIProvider.ANTHROPIC,
    model: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 1024,
    systemPrompt: 'Test system prompt',
    cacheEnabled: false,
    metadata: { apiKey: 'test-api-key' },
  };
}

function createTestPersonality(): PersonalityProfile {
  return {
    name: 'Тестовый Персонаж',
    role: 'Тестовый администратор',
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
      greetings: ['Привет!'],
      farewells: ['Пока!'],
      acknowledgments: ['Понял!'],
      delays: ['Секунду...'],
      apologies: ['Извините!'],
      transitions: ['Кстати,'],
      fillers: ['ну'],
      preferredPhrases: ['Рада помочь!'],
    },
    restrictions: {
      avoidWords: ['нейросеть'],
      avoidTopics: [],
      maxMessageLength: 500,
      avoidStyles: [],
    },
  };
}

describe('AIEngine', () => {
  let engine: AIEngine;

  beforeEach(() => {
    engine = new AIEngine(createTestConfig());
  });

  describe('buildSystemPrompt', () => {
    it('returns a string containing personality name', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const prompt = engine.buildSystemPrompt(personality, 'Knowledge context here');

      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Тестовый Персонаж');
    });

    it('includes knowledge context in the prompt', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const knowledgeContext = 'Our business is located at 123 Main Street';
      const prompt = engine.buildSystemPrompt(personality, knowledgeContext);

      expect(prompt).toContain(knowledgeContext);
    });

    it('includes role in the prompt', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const prompt = engine.buildSystemPrompt(personality, '');

      expect(prompt).toContain('Тестовый администратор');
    });

    it('includes additional instructions when provided', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const prompt = engine.buildSystemPrompt(personality, '', [
        'Be extra careful',
        'Use more emoji',
      ]);

      expect(prompt).toContain('Be extra careful');
      expect(prompt).toContain('Use more emoji');
    });

    it('includes restriction words', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const prompt = engine.buildSystemPrompt(personality, '');

      expect(prompt).toContain('нейросеть');
    });
  });

  describe('initialize', () => {
    it('sets up the engine without throwing', () => {
      expect(() => engine.initialize()).not.toThrow();
    });

    it('allows subsequent calls to buildSystemPrompt', () => {
      engine.initialize();

      const personality = createTestPersonality();
      const prompt = engine.buildSystemPrompt(personality, 'test');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('throws for unsupported provider', () => {
      const config = createTestConfig();
      config.provider = 'unsupported' as AIProvider;
      const badEngine = new AIEngine(config);

      expect(() => badEngine.initialize()).toThrow(/not supported/);
    });
  });

  describe('generateHumanLikeResponse', () => {
    it('throws if not initialized', async () => {
      const { createTestContext } = await import('../../fixtures/test-data');
      const context = createTestContext();
      const personality = createTestPersonality();

      await expect(
        engine.generateHumanLikeResponse('hello', context, [], personality)
      ).rejects.toThrow(/not initialized/);
    });

    it('returns a response when initialized', async () => {
      engine.initialize();

      const { createTestContext } = await import('../../fixtures/test-data');
      const context = createTestContext();
      const personality = createTestPersonality();

      const response = await engine.generateHumanLikeResponse(
        'Привет, какие у вас услуги?',
        context,
        [],
        personality
      );

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
      expect(typeof response.confidence).toBe('number');
      expect(typeof response.requiresHandoff).toBe('boolean');
      expect(typeof response.typingDelay).toBe('number');
      expect(typeof response.pauseBeforeSend).toBe('number');
      expect(Array.isArray(response.usedKnowledge)).toBe(true);
    });
  });

  describe('generateResponse', () => {
    it('throws if not initialized', async () => {
      const { createTestContext } = await import('../../fixtures/test-data');
      const context = createTestContext();
      const personality = createTestPersonality();

      await expect(
        engine.generateResponse({
          message: 'test',
          context,
          relevantKnowledge: [],
          personality,
        })
      ).rejects.toThrow(/not initialized/);
    });

    it('returns a response when initialized', async () => {
      engine.initialize();

      const { createTestContext } = await import('../../fixtures/test-data');
      const context = createTestContext();
      const personality = createTestPersonality();

      const response = await engine.generateResponse({
        message: 'test message',
        context,
        relevantKnowledge: [],
        personality,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.provider).toBe(AIProvider.ANTHROPIC);
    });
  });
});
