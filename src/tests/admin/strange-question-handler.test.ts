import { StrangeQuestionHandler, StrangeQuestionConfig } from '../../src/core/strange-question-handler';
import { ConversationContext, ConversationMode, ClientType, EmotionalState, PlatformType } from '../../src/types';

describe('StrangeQuestionHandler', () => {
  const defaultConfig: StrangeQuestionConfig = {
    enabled: true,
    maxBeforeHandoff: 2,
    responseTemplate: 'Извините, я специализируюсь на вопросах о коворкинге.',
    firstResponseTemplate: 'Что?',
    deferToViewingTemplate: 'Такие детали лучше обсудить на просмотре.',
    delayBetweenMessages: 5000,
    allowedTopics: ['аренда', 'офис', 'коворкинг'],
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

  test('on-topic questions are not strange', async () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    expect(await handler.isStrangeQuestion('Какая цена аренды офиса?', emptyContext)).toBe(false);
    expect(await handler.isStrangeQuestion('Где находится коворкинг?', emptyContext)).toBe(false);
    expect(await handler.isStrangeQuestion('Есть свободные переговорные?', emptyContext)).toBe(false);
  });

  test('obviously strange questions are detected', async () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    expect(await handler.isStrangeQuestion('Расскажи анекдот', emptyContext)).toBe(true);
    expect(await handler.isStrangeQuestion('Спой песню про лето', emptyContext)).toBe(true);
    expect(await handler.isStrangeQuestion('Какой курс доллара?', emptyContext)).toBe(true);
  });

  test('returns false when disabled', async () => {
    const handler = new StrangeQuestionHandler({ ...defaultConfig, enabled: false });
    expect(await handler.isStrangeQuestion('Расскажи анекдот', emptyContext)).toBe(false);
  });

  test('handleStrange returns two messages on first strange question', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    const result = handler.handleStrange('conv-1');
    expect(result.action).toBe('respond');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe('Что?');
    expect(result.messages[0].delayMs).toBe(0);
    expect(result.messages[1].text).toBe(defaultConfig.responseTemplate);
    expect(result.messages[1].delayMs).toBe(5000);
    expect(handler.getStrangeCount('conv-1')).toBe(1);
  });

  test('handleStrange returns handoff on 2nd strange question', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    handler.handleStrange('conv-1'); // 1st
    const result = handler.handleStrange('conv-1'); // 2nd
    expect(result.action).toBe('handoff');
    expect(result.reason).toBe('repeated_strange_questions');
    expect(result.messages).toHaveLength(1);
    expect(handler.getStrangeCount('conv-1')).toBe(2);
  });

  test('handleStrange with maxBeforeHandoff=3', () => {
    const handler = new StrangeQuestionHandler({ ...defaultConfig, maxBeforeHandoff: 3 });
    handler.handleStrange('conv-1'); // 1
    const second = handler.handleStrange('conv-1'); // 2
    expect(second.action).toBe('respond');

    const third = handler.handleStrange('conv-1'); // 3
    expect(third.action).toBe('handoff');
  });

  test('isDeferToViewing detects complex on-topic questions', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    expect(handler.isDeferToViewing('Как выглядит офис вживую?')).toBe(true);
    expect(handler.isDeferToViewing('Покажите реальные фото')).toBe(true);
    expect(handler.isDeferToViewing('Нужно увидеть помещение')).toBe(true);
    expect(handler.isDeferToViewing('Какая цена?')).toBe(false);
  });

  test('handleDeferToViewing returns defer_to_viewing action', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    const result = handler.handleDeferToViewing();
    expect(result.action).toBe('defer_to_viewing');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe(defaultConfig.deferToViewingTemplate);
  });

  test('resetCount clears the counter', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    handler.handleStrange('conv-1');
    expect(handler.getStrangeCount('conv-1')).toBe(1);

    handler.resetCount('conv-1');
    expect(handler.getStrangeCount('conv-1')).toBe(0);
  });

  test('different conversations have separate counters', () => {
    const handler = new StrangeQuestionHandler(defaultConfig);
    handler.handleStrange('conv-1');
    handler.handleStrange('conv-2');

    expect(handler.getStrangeCount('conv-1')).toBe(1);
    expect(handler.getStrangeCount('conv-2')).toBe(1);

    handler.handleStrange('conv-1');
    expect(handler.getStrangeCount('conv-1')).toBe(2);
    expect(handler.getStrangeCount('conv-2')).toBe(1);
  });

  test('handleStrange returns ignore when disabled', () => {
    const handler = new StrangeQuestionHandler({ ...defaultConfig, enabled: false });
    const result = handler.handleStrange('conv-1');
    expect(result.action).toBe('ignore');
    expect(result.messages).toHaveLength(0);
  });

  test('isEnabled returns correct value', () => {
    expect(new StrangeQuestionHandler(defaultConfig).isEnabled()).toBe(true);
    expect(new StrangeQuestionHandler({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });
});
