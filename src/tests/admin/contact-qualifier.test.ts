import { ContactQualifier, ContactType, QualifierConfig } from '../../src/core/contact-qualifier';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType, MessageRole, MessageHandler } from '../../src/types';

describe('ContactQualifier', () => {
  const defaultConfig: QualifierConfig = {
    enabled: true,
    classifyAfterMessages: 2,
    spamKeywords: [],
    brokerKeywords: [],
    residentKeywords: [],
    supplierKeywords: [],
    residentFolders: ['Резиденты'],
    officeNumberInName: true,
  };

  const makeContext = (messages: Array<{ role: string; content: string }>, overrides?: Partial<ConversationContext>): ConversationContext => ({
    conversationId: 'test-conv-1',
    userId: 'user-1',
    platform: PlatformType.TELEGRAM,
    sessionStarted: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 86400000,
    clientType: ClientType.NEW,
    messageHistory: messages.map((m, i) => ({
      messageId: `msg-${i}`,
      timestamp: Date.now(),
      role: m.role as MessageRole,
      content: m.content,
      handledBy: MessageHandler.AI,
    })),
    emotionalState: EmotionalState.NEUTRAL,
    suspectAI: false,
    complexQuery: false,
    requiresHandoff: false,
    mode: ConversationMode.AI,
    metadata: {},
    ...overrides,
  });

  test('returns CLIENT by default when disabled', async () => {
    const q = new ContactQualifier({ ...defaultConfig, enabled: false });
    const ctx = makeContext([{ role: 'user', content: 'test' }]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.CLIENT);
  });

  test('returns UNKNOWN when not enough messages', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([{ role: 'user', content: 'Привет' }]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.UNKNOWN);
  });

  test('classifies SPAM by keywords', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Привет! Хочу предложить заработок без вложений' },
      { role: 'user', content: 'Казино онлайн, ставки на спорт' },
    ]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.SPAM);
  });

  test('classifies BROKER by keywords', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Добрый день! Я агент по недвижимости' },
      { role: 'user', content: 'Интересует партнёрское сотрудничество, какая комиссия?' },
    ]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.BROKER);
  });

  test('classifies RESIDENT by keywords', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Здравствуйте, мы у вас арендуем офис' },
      { role: 'user', content: 'Не работает кондиционер в переговорной' },
    ]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.RESIDENT);
  });

  test('classifies SUPPLIER by keywords', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Здравствуйте, мы поставщик канцелярии' },
      { role: 'user', content: 'Вот наш прайс-лист на обслуживание' },
    ]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.SUPPLIER);
  });

  test('defaults to CLIENT when no keywords match', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Добрый день!' },
      { role: 'user', content: 'Какие у вас есть свободные помещения?' },
    ]);
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.CLIENT);
  });

  test('shouldIgnore returns true for SPAM', () => {
    const q = new ContactQualifier(defaultConfig);
    expect(q.shouldIgnore(ContactType.SPAM)).toBe(true);
    expect(q.shouldIgnore(ContactType.CLIENT)).toBe(false);
    expect(q.shouldIgnore(ContactType.BROKER)).toBe(false);
  });

  test('getHandlingStrategy returns correct strategies', () => {
    const q = new ContactQualifier(defaultConfig);

    const client = q.getHandlingStrategy(ContactType.CLIENT);
    expect(client.allowFullService).toBe(true);
    expect(client.handoffToManager).toBe(false);

    const broker = q.getHandlingStrategy(ContactType.BROKER);
    expect(broker.allowFullService).toBe(false);
    expect(broker.handoffToManager).toBe(true);

    const spam = q.getHandlingStrategy(ContactType.SPAM);
    expect(spam.ignoreMessages).toBe(true);
  });

  test('caches classification results', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Привет! Казино и ставки!' },
      { role: 'user', content: 'Лучший заработок без вложений' },
    ]);
    const result1 = await q.classify(ctx.messageHistory, ctx);
    const result2 = await q.classify(ctx.messageHistory, ctx);
    expect(result1).toBe(result2);
    expect(result1).toBe(ContactType.SPAM);
  });

  test('resetClassification clears cache', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext([
      { role: 'user', content: 'Привет! Казино!' },
      { role: 'user', content: 'Заработок без вложений' },
    ]);
    await q.classify(ctx.messageHistory, ctx);
    expect(q.getCachedType('test-conv-1')).toBe(ContactType.SPAM);

    q.resetClassification('test-conv-1');
    expect(q.getCachedType('test-conv-1')).toBeUndefined();
  });

  // New: folder-based detection
  test('classifies RESIDENT by Telegram folder', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext(
      [
        { role: 'user', content: 'Добрый день' },
        { role: 'user', content: 'У нас проблема' },
      ],
      { metadata: { telegramFolder: 'Резиденты' } }
    );
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.RESIDENT);
  });

  // New: name pattern detection
  test('classifies RESIDENT by office number in name', async () => {
    const q = new ContactQualifier(defaultConfig);
    const ctx = makeContext(
      [
        { role: 'user', content: 'Здравствуйте' },
        { role: 'user', content: 'Нужна помощь' },
      ],
      {
        clientProfile: {
          userId: 'user-1',
          platform: PlatformType.TELEGRAM,
          name: 'Ксения 307',
          firstContact: Date.now(),
          lastContact: Date.now(),
          totalConversations: 1,
          totalMessages: 2,
          type: ClientType.NEW,
          tags: [],
          previousTopics: [],
          metadata: {},
        },
      }
    );
    expect(await q.classify(ctx.messageHistory, ctx)).toBe(ContactType.RESIDENT);
  });
});
