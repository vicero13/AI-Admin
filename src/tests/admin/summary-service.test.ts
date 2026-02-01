import { SummaryService, SummaryConfig } from '../../src/core/summary-service';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType, MessageRole, MessageHandler } from '../../src/types';

describe('SummaryService', () => {
  const defaultConfig: SummaryConfig = {
    enabled: true,
    notifyOnViewing: true,
    notificationChannel: 'telegram',
  };

  const makeContext = (messages: Array<{ role: string; content: string }>): ConversationContext => ({
    conversationId: 'test-conv-1',
    userId: 'user-1',
    platform: PlatformType.TELEGRAM,
    sessionStarted: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 86400000,
    clientType: ClientType.NEW,
    clientProfile: { userId: 'user-1', platform: PlatformType.TELEGRAM, name: 'Алексей', firstContact: Date.now(), lastContact: Date.now(), totalConversations: 1, totalMessages: 3, type: ClientType.NEW, tags: [], previousTopics: [], metadata: {} },
    messageHistory: messages.map((m, i) => ({
      messageId: `msg-${i}`,
      timestamp: Date.now(),
      role: m.role as MessageRole,
      content: m.content,
      handledBy: MessageHandler.AI,
    })),
    currentTopic: 'аренда офиса',
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
  });

  test('detectViewingConfirmation detects direct confirmations', async () => {
    const service = new SummaryService(defaultConfig);
    const ctx = makeContext([]);

    expect(await service.detectViewingConfirmation('Хочу посмотреть офис', ctx)).toBe(true);
    expect(await service.detectViewingConfirmation('Запишите меня на просмотр', ctx)).toBe(true);
    expect(await service.detectViewingConfirmation('Когда можно приехать посмотреть?', ctx)).toBe(true);
    expect(await service.detectViewingConfirmation('Да, давайте запишусь', ctx)).toBe(true);
    expect(await service.detectViewingConfirmation('Готова приехать на просмотр', ctx)).toBe(true);
  });

  test('detectViewingConfirmation rejects non-confirmations', async () => {
    const service = new SummaryService(defaultConfig);
    const ctx = makeContext([]);

    expect(await service.detectViewingConfirmation('Какие есть офисы?', ctx)).toBe(false);
    expect(await service.detectViewingConfirmation('Спасибо за информацию', ctx)).toBe(false);
    expect(await service.detectViewingConfirmation('Привет', ctx)).toBe(false);
    expect(await service.detectViewingConfirmation('Сколько стоит аренда?', ctx)).toBe(false);
  });

  test('detectViewingConfirmation returns false when disabled', async () => {
    const service = new SummaryService({ ...defaultConfig, enabled: false });
    const ctx = makeContext([]);
    expect(await service.detectViewingConfirmation('Хочу посмотреть офис', ctx)).toBe(false);
  });

  test('detectViewingConfirmation returns false when notifyOnViewing is false', async () => {
    const service = new SummaryService({ ...defaultConfig, notifyOnViewing: false });
    const ctx = makeContext([]);
    expect(await service.detectViewingConfirmation('Хочу посмотреть офис', ctx)).toBe(false);
  });

  test('generateSummary produces a summary', async () => {
    const service = new SummaryService(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Здравствуйте, ищу офис на 5 человек' },
      { role: 'assistant', content: 'Добрый день! У нас есть несколько вариантов.' },
      { role: 'user', content: 'Хочу записаться на просмотр' },
    ]);

    const summary = await service.generateSummary(ctx);
    expect(summary.conversationId).toBe('test-conv-1');
    expect(summary.clientName).toBe('Алексей');
    expect(summary.summaryText).toBeTruthy();
    expect(summary.timestamp).toBeGreaterThan(0);
  });

  test('generateSummary without messages', async () => {
    const service = new SummaryService(defaultConfig);
    const ctx = makeContext([]);

    const summary = await service.generateSummary(ctx);
    expect(summary.summaryText).toBeTruthy();
  });

  test('notifyAdmin calls notifier', async () => {
    const mockNotifier = jest.fn().mockResolvedValue(undefined);
    const service = new SummaryService(defaultConfig, undefined, mockNotifier);

    const summary = {
      conversationId: 'conv-1',
      clientName: 'Алексей',
      interestedIn: 'Офис на 5 человек',
      keyRequirements: ['парковка', 'переговорная'],
      viewingConfirmed: true,
      summaryText: 'Клиент ищет офис.',
      timestamp: Date.now(),
    };

    await service.notifyAdmin(summary);
    expect(mockNotifier).toHaveBeenCalledTimes(1);
    expect(mockNotifier).toHaveBeenCalledWith(expect.stringContaining('Алексей'), 'high');
    expect(mockNotifier).toHaveBeenCalledWith(expect.stringContaining('Офис на 5 человек'), 'high');
  });

  test('notifyAdmin without notifier does not throw', async () => {
    const service = new SummaryService(defaultConfig);
    const summary = {
      conversationId: 'conv-1',
      interestedIn: 'Офис',
      keyRequirements: [],
      viewingConfirmed: true,
      summaryText: 'Test',
      timestamp: Date.now(),
    };
    await expect(service.notifyAdmin(summary)).resolves.not.toThrow();
  });

  test('isEnabled returns correct value', () => {
    expect(new SummaryService(defaultConfig).isEnabled()).toBe(true);
    expect(new SummaryService({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });
});
