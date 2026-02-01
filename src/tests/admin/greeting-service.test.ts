import { GreetingService, GreetingConfig } from '../../src/core/greeting-service';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType } from '../../src/types';

describe('GreetingService', () => {
  const defaultConfig: GreetingConfig = {
    enabled: true,
    template: 'Здравствуйте, {name}! {{emoji}} Меня зовут Валерия. Чем могу Вам помочь?',
    shortTemplate: 'Добрый день! {{emoji}}',
    useAI: false,
    agentName: 'Валерия',
    emojis: ['😊', '🤗', '👋'],
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
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
  };

  test('isNewContact returns true for empty history', () => {
    const service = new GreetingService(defaultConfig);
    expect(service.isNewContact(emptyContext)).toBe(true);
  });

  test('isNewContact returns true for single message history', () => {
    const service = new GreetingService(defaultConfig);
    const ctx = {
      ...emptyContext,
      messageHistory: [{
        messageId: 'msg-1',
        timestamp: Date.now(),
        role: 'user' as any,
        content: 'Привет',
        handledBy: 'ai' as any,
      }],
    };
    expect(service.isNewContact(ctx)).toBe(true);
  });

  test('isNewContact returns false for 2+ messages', () => {
    const service = new GreetingService(defaultConfig);
    const ctx = {
      ...emptyContext,
      messageHistory: [
        { messageId: 'msg-1', timestamp: Date.now(), role: 'user' as any, content: 'Привет', handledBy: 'ai' as any },
        { messageId: 'msg-2', timestamp: Date.now(), role: 'assistant' as any, content: 'Здравствуйте!', handledBy: 'ai' as any },
      ],
    };
    expect(service.isNewContact(ctx)).toBe(false);
  });

  test('generateGreeting full type with name', async () => {
    const service = new GreetingService(defaultConfig);
    const greeting = await service.generateGreeting('Алексей', undefined, 'full');
    expect(greeting).toContain('Алексей');
    expect(greeting).toContain('Валерия');
    // Should have replaced {{emoji}} with an actual emoji
    expect(greeting).not.toContain('{{emoji}}');
  });

  test('generateGreeting full type without name', async () => {
    const service = new GreetingService(defaultConfig);
    const greeting = await service.generateGreeting(undefined, undefined, 'full');
    expect(greeting).not.toContain('{name}');
    expect(greeting).toContain('Валерия');
  });

  test('generateGreeting short type', async () => {
    const service = new GreetingService(defaultConfig);
    const greeting = await service.generateGreeting(undefined, undefined, 'short');
    expect(greeting).toContain('Добрый день!');
    expect(greeting).not.toContain('{{emoji}}');
  });

  test('generateGreeting none type returns empty', async () => {
    const service = new GreetingService(defaultConfig);
    const greeting = await service.generateGreeting('Алексей', undefined, 'none');
    expect(greeting).toBe('');
  });

  test('generateGreeting returns empty string when disabled', async () => {
    const service = new GreetingService({ ...defaultConfig, enabled: false });
    const greeting = await service.generateGreeting('Алексей');
    expect(greeting).toBe('');
  });

  test('getRandomEmoji returns emoji from config list', () => {
    const service = new GreetingService(defaultConfig);
    const emoji = service.getRandomEmoji();
    expect(defaultConfig.emojis).toContain(emoji);
  });

  test('getRandomEmoji uses default list when config empty', () => {
    const service = new GreetingService({ ...defaultConfig, emojis: [] });
    const emoji = service.getRandomEmoji();
    expect(typeof emoji).toBe('string');
    expect(emoji.length).toBeGreaterThan(0);
  });

  test('validateName returns capitalized first name', () => {
    const service = new GreetingService(defaultConfig);
    expect(service.validateName('алексей иванов')).toBe('Алексей');
    expect(service.validateName('Мария')).toBe('Мария');
  });

  test('validateName returns null for bot-like names', () => {
    const service = new GreetingService(defaultConfig);
    expect(service.validateName('bot_test')).toBeNull();
    expect(service.validateName('test123')).toBeNull();
    expect(service.validateName('user42')).toBeNull();
    expect(service.validateName('admin')).toBeNull();
  });

  test('validateName returns null for empty or too short names', () => {
    const service = new GreetingService(defaultConfig);
    expect(service.validateName('')).toBeNull();
    expect(service.validateName('A')).toBeNull();
    expect(service.validateName('   ')).toBeNull();
  });

  test('validateName returns null for suspicious patterns', () => {
    const service = new GreetingService(defaultConfig);
    expect(service.validateName('https://example.com')).toBeNull();
    expect(service.validateName('12345')).toBeNull();
    expect(service.validateName('<script>')).toBeNull();
  });

  test('isEnabled returns correct value', () => {
    expect(new GreetingService(defaultConfig).isEnabled()).toBe(true);
    expect(new GreetingService({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });
});
