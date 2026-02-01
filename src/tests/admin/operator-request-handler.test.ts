import { OperatorRequestHandler, OperatorRequestConfig } from '../../src/core/operator-request-handler';

describe('OperatorRequestHandler', () => {
  const defaultConfig: OperatorRequestConfig = {
    enabled: true,
    operatorPatterns: [
      'позови оператора',
      'переключи на оператора',
      'хочу говорить с человеком',
      'соедини с менеджером',
    ],
    botQuestionPatterns: [
      'ты бот',
      'ты робот',
      'ты нейросеть',
      'ты человек',
    ],
    replyToGreeting: 'Это я писала Вам ранее 😊',
    offerManager: 'Хотите, переключу на руководителя?',
    transferMessage: 'Хорошо, сейчас переключу!',
    notBotResponse: 'Нет, я менеджер ElasticSpace ) Чем могу помочь?',
    delayBeforeOffer: 10000,
    delayBeforeTransfer: 15000,
  };

  test('isOperatorRequest detects operator patterns', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    expect(handler.isOperatorRequest('Позови оператора')).toBe(true);
    expect(handler.isOperatorRequest('Хочу говорить с человеком!')).toBe(true);
    expect(handler.isOperatorRequest('Соедини с менеджером пожалуйста')).toBe(true);
    expect(handler.isOperatorRequest('Привет!')).toBe(false);
    expect(handler.isOperatorRequest('Какая цена аренды?')).toBe(false);
  });

  test('isOperatorRequest returns false when disabled', () => {
    const handler = new OperatorRequestHandler({ ...defaultConfig, enabled: false });
    expect(handler.isOperatorRequest('Позови оператора')).toBe(false);
  });

  test('isBotQuestion detects bot questions', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    expect(handler.isBotQuestion('Ты бот?')).toBe(true);
    expect(handler.isBotQuestion('Ты робот или человек?')).toBe(true);
    expect(handler.isBotQuestion('Привет!')).toBe(false);
  });

  test('handleBotQuestion returns not_bot response', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    const result = handler.handleBotQuestion('conv-1');
    expect(result.action).toBe('not_bot');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe(defaultConfig.notBotResponse);
    expect(result.handoff).toBe(false);
  });

  test('handleOperatorRequest first time returns offer_manager with 2 messages', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    const result = handler.handleOperatorRequest('conv-1');
    expect(result.action).toBe('offer_manager');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe(defaultConfig.replyToGreeting);
    expect(result.messages[0].delayMs).toBe(0);
    expect(result.messages[1].text).toBe(defaultConfig.offerManager);
    expect(result.messages[1].delayMs).toBe(defaultConfig.delayBeforeOffer);
    expect(result.handoff).toBe(false);
  });

  test('handleOperatorRequest second time returns transfer with handoff', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    handler.handleOperatorRequest('conv-1'); // first call
    const result = handler.handleOperatorRequest('conv-1'); // second call
    expect(result.action).toBe('transfer');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe(defaultConfig.transferMessage);
    expect(result.handoff).toBe(true);
  });

  test('isTransferConfirmation returns true for "Да" after offer', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    handler.handleOperatorRequest('conv-1'); // sets stage to 'offered'
    expect(handler.isTransferConfirmation('Да, переключи', 'conv-1')).toBe(true);
    expect(handler.isTransferConfirmation('Давайте', 'conv-1')).toBe(true);
    expect(handler.isTransferConfirmation('Конечно', 'conv-1')).toBe(true);
  });

  test('isTransferConfirmation returns false if not in offered stage', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    expect(handler.isTransferConfirmation('Да', 'conv-1')).toBe(false);
  });

  test('resetState clears conversation state', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    handler.handleOperatorRequest('conv-1');
    expect(handler.getStage('conv-1')).toBe('offered');
    handler.resetState('conv-1');
    expect(handler.getStage('conv-1')).toBe('none');
  });

  test('different conversations have separate states', () => {
    const handler = new OperatorRequestHandler(defaultConfig);
    handler.handleOperatorRequest('conv-1');
    expect(handler.getStage('conv-1')).toBe('offered');
    expect(handler.getStage('conv-2')).toBe('none');
  });

  test('returns ignore when disabled', () => {
    const handler = new OperatorRequestHandler({ ...defaultConfig, enabled: false });
    const result = handler.handleOperatorRequest('conv-1');
    expect(result.action).toBe('ignore');
    expect(result.messages).toHaveLength(0);
  });

  test('isEnabled returns correct value', () => {
    expect(new OperatorRequestHandler(defaultConfig).isEnabled()).toBe(true);
    expect(new OperatorRequestHandler({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });
});
