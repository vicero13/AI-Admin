import { ResponseDelayService, ResponseDelayConfig } from '../../src/core/response-delay';

describe('ResponseDelayService', () => {
  const defaultConfig: ResponseDelayConfig = {
    enabled: true,
    readMin: 8000,
    readMax: 12000,
    typingMin: 25000,
    typingMax: 40000,
    typingRefreshInterval: 5000,
  };

  test('calculateReadDelay returns 0 when disabled', () => {
    const service = new ResponseDelayService({ ...defaultConfig, enabled: false });
    expect(service.calculateReadDelay('Hello')).toBe(0);
  });

  test('calculateReadDelay returns value within range', () => {
    const service = new ResponseDelayService(defaultConfig);
    for (let i = 0; i < 20; i++) {
      const delay = service.calculateReadDelay('Привет, хочу узнать про аренду офиса');
      expect(delay).toBeGreaterThanOrEqual(defaultConfig.readMin);
      expect(delay).toBeLessThanOrEqual(defaultConfig.readMax * 1.5);
    }
  });

  test('calculateTypingDelay returns 0 when disabled', () => {
    const service = new ResponseDelayService({ ...defaultConfig, enabled: false });
    expect(service.calculateTypingDelay('Hello')).toBe(0);
  });

  test('calculateTypingDelay returns value within range', () => {
    const service = new ResponseDelayService(defaultConfig);
    for (let i = 0; i < 20; i++) {
      const delay = service.calculateTypingDelay('Здравствуйте! Рада помочь Вам с выбором офиса.');
      expect(delay).toBeGreaterThanOrEqual(defaultConfig.typingMin);
      expect(delay).toBeLessThanOrEqual(defaultConfig.typingMax * 1.2);
    }
  });

  test('longer messages produce longer read delays on average', () => {
    const service = new ResponseDelayService(defaultConfig);
    const shortDelays: number[] = [];
    const longDelays: number[] = [];

    for (let i = 0; i < 50; i++) {
      shortDelays.push(service.calculateReadDelay('Привет'));
      longDelays.push(service.calculateReadDelay('Здравствуйте! Я хотел бы узнать подробнее о ваших офисах, какие есть варианты для компании из 10 человек, включая переговорные комнаты и доступ к кухне?'));
    }

    const avgShort = shortDelays.reduce((a, b) => a + b, 0) / shortDelays.length;
    const avgLong = longDelays.reduce((a, b) => a + b, 0) / longDelays.length;

    // Long messages should produce slightly longer delays on average
    expect(avgLong).toBeGreaterThanOrEqual(avgShort);
  });

  test('executeDelay sends typing indicators', async () => {
    const typingSender = {
      sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    };

    const fastConfig: ResponseDelayConfig = {
      enabled: true,
      readMin: 10,
      readMax: 20,
      typingMin: 50,
      typingMax: 100,
      typingRefreshInterval: 25,
    };

    const service = new ResponseDelayService(fastConfig, typingSender);
    await service.executeDelay('conv-1', 'biz-1', 'Hello', 'Hi there!');

    // Should have called typing indicator at least once
    expect(typingSender.sendTypingIndicator).toHaveBeenCalled();
    expect(typingSender.sendTypingIndicator).toHaveBeenCalledWith('conv-1', 'biz-1');
  });

  test('executeDelay does nothing when disabled', async () => {
    const typingSender = {
      sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ResponseDelayService(
      { ...defaultConfig, enabled: false },
      typingSender
    );
    await service.executeDelay('conv-1', 'biz-1', 'Hello', 'Hi');
    expect(typingSender.sendTypingIndicator).not.toHaveBeenCalled();
  });

  test('isEnabled returns correct value', () => {
    const enabled = new ResponseDelayService(defaultConfig);
    expect(enabled.isEnabled()).toBe(true);

    const disabled = new ResponseDelayService({ ...defaultConfig, enabled: false });
    expect(disabled.isEnabled()).toBe(false);
  });
});
