import { ConversationDetector, ConversationDetectorConfig } from '../../src/core/conversation-detector';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType } from '../../src/types';

describe('ConversationDetector', () => {
  const defaultConfig: ConversationDetectorConfig = {
    enabled: true,
    newConversationGapDays: 180,
    newDayGapHours: 12,
    chatClearedDetection: true,
  };

  const makeContext = (
    messageCount: number = 0,
    lastActivity?: number,
    includeAssistant: boolean = true
  ): ConversationContext => ({
    conversationId: 'test-conv-1',
    userId: 'user-1',
    platform: PlatformType.TELEGRAM,
    sessionStarted: Date.now(),
    lastActivity: lastActivity ?? Date.now(),
    expiresAt: Date.now() + 86400000,
    clientType: ClientType.NEW,
    messageHistory: Array.from({ length: messageCount }, (_, i) => ({
      messageId: `msg-${i}`,
      timestamp: Date.now(),
      role: (includeAssistant && i % 2 === 1 ? 'assistant' : 'user') as any,
      content: `message ${i}`,
      handledBy: 'ai' as any,
    })),
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
  });

  test('detects new_contact when no message history', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(0);
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_contact');
  });

  test('detects continuation for active conversation', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(5, Date.now() - 1000); // 1 second ago
    expect(detector.detectStatus('conv-1', ctx)).toBe('continuation');
  });

  test('detects new_day for 12+ hour gap', () => {
    const detector = new ConversationDetector(defaultConfig);
    const thirteenHoursAgo = Date.now() - 13 * 60 * 60 * 1000;
    const ctx = makeContext(5, thirteenHoursAgo);
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_day');
  });

  test('detects new_conversation for 180+ day gap', () => {
    const detector = new ConversationDetector(defaultConfig);
    const sixMonthsAgo = Date.now() - 181 * 24 * 60 * 60 * 1000;
    const ctx = makeContext(5, sixMonthsAgo);
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_conversation');
  });

  test('detects chat cleared when message_id decreases', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(5, Date.now() - 1000);

    // First call with message_id 100
    detector.detectStatus('conv-1', ctx, 100);
    // Second call with message_id 5 (chat was cleared)
    expect(detector.detectStatus('conv-1', ctx, 5)).toBe('new_conversation');
  });

  test('getGreetingType returns correct types', () => {
    const detector = new ConversationDetector(defaultConfig);
    expect(detector.getGreetingType('new_contact')).toBe('full');
    expect(detector.getGreetingType('new_conversation')).toBe('full');
    expect(detector.getGreetingType('new_day')).toBe('short');
    expect(detector.getGreetingType('continuation')).toBe('none');
  });

  test('returns continuation when disabled', () => {
    const detector = new ConversationDetector({ ...defaultConfig, enabled: false });
    const ctx = makeContext(0);
    expect(detector.detectStatus('conv-1', ctx)).toBe('continuation');
  });

  test('resetConversation clears state', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(5, Date.now() - 1000);

    detector.detectStatus('conv-1', ctx, 100);
    detector.resetConversation('conv-1');
    // After reset, no previous message_id stored, so no chat-cleared detection
    expect(detector.detectStatus('conv-1', ctx, 5)).toBe('continuation');
  });

  test('detects new_contact when history has only user messages (no assistant)', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(5, Date.now() - 1000, false); // 5 user messages, no assistant
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_contact');
  });

  test('detects chat cleared after server restart (low message_id heuristic)', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(10, Date.now() - 1000); // 10 messages with assistant replies

    // No previous message_id stored (simulates server restart),
    // but message_id=1 with 10 messages in history → chat was cleared
    expect(detector.detectStatus('conv-1', ctx, 1)).toBe('new_conversation');
  });

  test('does not false-positive chat cleared for normal low message_id', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(2, Date.now() - 1000); // only 2 messages (short history)

    // Short history + low message_id is normal for a new conversation
    expect(detector.detectStatus('conv-1', ctx, 2)).toBe('continuation');
  });

  test('does not duplicate greeting after markGreetingSent', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(0);

    // First message → new_contact
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_contact');

    // Mark greeting as sent
    detector.markGreetingSent('conv-1');

    // Second message before bot replies → should be continuation, not new_contact
    expect(detector.detectStatus('conv-1', ctx)).toBe('continuation');
  });

  test('resetConversation clears greetingSent flag', () => {
    const detector = new ConversationDetector(defaultConfig);
    const ctx = makeContext(0);

    detector.markGreetingSent('conv-1');
    expect(detector.detectStatus('conv-1', ctx)).toBe('continuation');

    detector.resetConversation('conv-1');
    expect(detector.detectStatus('conv-1', ctx)).toBe('new_contact');
  });

  test('isEnabled returns correct value', () => {
    expect(new ConversationDetector(defaultConfig).isEnabled()).toBe(true);
    expect(new ConversationDetector({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });
});
