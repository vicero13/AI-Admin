import {
  HandoffReasonType,
  RiskLevel,
} from '../../src/types';

export function createMockAIEngine() {
  return {
    initialize: jest.fn(),

    generateResponse: jest.fn().mockResolvedValue({
      text: 'Mock AI response',
      metadata: {
        provider: 'anthropic',
        model: 'claude-3',
        tokensUsed: 100,
        latency: 500,
        finishReason: 'stop',
        cached: false,
        timestamp: Date.now(),
      },
    }),

    generateHumanLikeResponse: jest.fn().mockResolvedValue({
      text: 'Mock human-like response',
      confidence: 0.85,
      requiresHandoff: false,
      handoffReason: undefined,
      typingDelay: 1500,
      pauseBeforeSend: 500,
      usedKnowledge: [],
    }),

    analyzeIntent: jest.fn().mockResolvedValue({
      primaryIntent: 'general_question',
      confidence: 0.9,
      entities: [],
    }),

    buildSystemPrompt: jest.fn().mockReturnValue('Mock system prompt'),
  };
}
