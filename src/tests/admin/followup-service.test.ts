import { FollowUpService, FollowUpConfig } from '../../src/core/followup-service';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType } from '../../src/types';

describe('FollowUpService', () => {
  const defaultConfig: FollowUpConfig = {
    enabled: true,
    delayMinutes: 60,
    maxPerConversation: 3,
    cooldownMinutes: 30,
    contextMessages: {
      viewing_time: 'Подскажите, Вам удобно подъехать на этой неделе?',
      presentation_sent: 'Удалось ознакомиться с презентацией?',
      thinking: '?',
      minimal: '?',
    },
  };

  const emptyContext: ConversationContext = {
    conversationId: 'test-conv-1',
    userId: 'user-1',
    platform: PlatformType.TELEGRAM,
    sessionStarted: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 86400000,
    clientType: ClientType.NEW,
    messageHistory: [],
    currentTopic: 'аренда офиса',
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('canSendMore returns true initially', () => {
    const service = new FollowUpService(defaultConfig);
    expect(service.canSendMore('conv-1')).toBe(true);
  });

  test('canSendMore returns false after max follow-ups', async () => {
    const service = new FollowUpService(defaultConfig);

    for (let i = 0; i < 3; i++) {
      await service.sendFollowUp('conv-1', emptyContext);
    }

    expect(service.canSendMore('conv-1')).toBe(false);
    expect(service.getFollowUpCount('conv-1')).toBe(3);
  });

  test('sendFollowUp returns null when disabled', async () => {
    const service = new FollowUpService({ ...defaultConfig, enabled: false });
    const result = await service.sendFollowUp('conv-1', emptyContext);
    expect(result).toBeNull();
  });

  test('sendFollowUp returns null when max reached', async () => {
    const service = new FollowUpService({ ...defaultConfig, maxPerConversation: 0 });
    const result = await service.sendFollowUp('conv-1', emptyContext);
    expect(result).toBeNull();
  });

  test('sendFollowUp generates template message without AI', async () => {
    const service = new FollowUpService(defaultConfig);
    const result = await service.sendFollowUp('conv-1', emptyContext);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('sendFollowUp increments counter', async () => {
    const service = new FollowUpService(defaultConfig);
    expect(service.getFollowUpCount('conv-1')).toBe(0);

    await service.sendFollowUp('conv-1', emptyContext);
    expect(service.getFollowUpCount('conv-1')).toBe(1);

    await service.sendFollowUp('conv-1', emptyContext);
    expect(service.getFollowUpCount('conv-1')).toBe(2);
  });

  test('resetState clears all state', async () => {
    const service = new FollowUpService(defaultConfig);
    await service.sendFollowUp('conv-1', emptyContext);
    expect(service.getFollowUpCount('conv-1')).toBe(1);

    service.resetState('conv-1');
    expect(service.getFollowUpCount('conv-1')).toBe(0);
    expect(service.canSendMore('conv-1')).toBe(true);
  });

  test('cancelFollowUp does not throw for unknown conversation', () => {
    const service = new FollowUpService(defaultConfig);
    expect(() => service.cancelFollowUp('unknown')).not.toThrow();
  });

  test('destroy clears all states', async () => {
    const service = new FollowUpService(defaultConfig);
    await service.sendFollowUp('conv-1', emptyContext);
    await service.sendFollowUp('conv-2', emptyContext);

    service.destroy();
    expect(service.getFollowUpCount('conv-1')).toBe(0);
    expect(service.getFollowUpCount('conv-2')).toBe(0);
  });

  test('isEnabled returns correct value', () => {
    expect(new FollowUpService(defaultConfig).isEnabled()).toBe(true);
    expect(new FollowUpService({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });

  test('sendFollowUp with messageSender sends message', async () => {
    const mockSender = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    };

    const service = new FollowUpService(defaultConfig, undefined, mockSender);
    const result = await service.sendFollowUp('conv-1', emptyContext);

    expect(result).toBeTruthy();
    expect(mockSender.sendTypingIndicator).toHaveBeenCalledWith('conv-1', undefined);
    expect(mockSender.sendMessage).toHaveBeenCalled();
  });

  // New: context-aware messages
  test('setFollowUpContext and send uses context message', async () => {
    const service = new FollowUpService(defaultConfig);
    service.setFollowUpContext('conv-1', 'viewing_time');
    const result = await service.sendFollowUp('conv-1', emptyContext);
    expect(result).toBe('Подскажите, Вам удобно подъехать на этой неделе?');
  });

  test('third follow-up returns minimal "?" message', async () => {
    const service = new FollowUpService(defaultConfig);
    await service.sendFollowUp('conv-1', emptyContext); // 1
    await service.sendFollowUp('conv-1', emptyContext); // 2
    const result = await service.sendFollowUp('conv-1', emptyContext); // 3 - should be "?"
    // 3rd follow-up (index 2) uses minimal
    expect(result).toBe('?');
  });
});
