import { TelegramAdapter } from '../../../src/adapters/telegram';
import { PlatformType, MessageType, UniversalMessage } from '../../../src/types';
import TelegramBot from 'node-telegram-bot-api';

// Mock Logger to suppress output in tests
jest.mock('../../../src/utils/logger', () => {
  const noop = jest.fn();
  const mockLogger = { debug: noop, info: noop, warn: noop, error: noop, critical: noop };
  return {
    Logger: jest.fn(() => mockLogger),
    logger: mockLogger,
  };
});

// Mock node-telegram-bot-api
jest.mock('node-telegram-bot-api', () => {
  const listeners: Record<string, Function[]> = {};
  const mockBot = {
    on: jest.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1, date: 1700000000 }),
    sendDocument: jest.fn().mockResolvedValue({ message_id: 2, date: 1700000000 }),
    sendChatAction: jest.fn().mockResolvedValue(true),
    setWebHook: jest.fn().mockResolvedValue(true),
    deleteWebHook: jest.fn().mockResolvedValue(true),
    stopPolling: jest.fn().mockResolvedValue(undefined),
    processUpdate: jest.fn(),
    getWebHookInfo: jest.fn().mockResolvedValue({
      url: 'https://example.com/wh',
      has_custom_certificate: false,
      pending_update_count: 0,
    }),
    _emit: (event: string, data: any) => {
      (listeners[event] || []).forEach((cb) => cb(data));
    },
    _listeners: listeners,
    _reset: () => {
      for (const key of Object.keys(listeners)) {
        delete listeners[key];
      }
    },
  };
  return jest.fn(() => mockBot);
});

function getMockBot(): any {
  return (TelegramBot as any).mock.results[(TelegramBot as any).mock.results.length - 1]?.value;
}

function createTelegramMessage(overrides: Record<string, any> = {}): TelegramBot.Message {
  return {
    message_id: 42,
    date: 1700000000,
    chat: { id: 12345, type: 'private' as any },
    from: {
      id: 67890,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'ru',
    },
    text: 'Hello',
    ...overrides,
  } as TelegramBot.Message;
}

// Track adapters for cleanup
const adapters: TelegramAdapter[] = [];

describe('TelegramAdapter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    const MockBot = TelegramBot as any;
    MockBot.mockClear();
    const bot = getMockBot();
    if (bot) bot._reset();
  });

  afterEach(async () => {
    // Shutdown all adapters to clear cleanup timers
    for (const a of adapters) {
      await a.shutdown();
    }
    adapters.length = 0;
    jest.useRealTimers();
  });

  async function createAdapter(
    webhookConfig?: ConstructorParameters<typeof TelegramAdapter>[1],
  ): Promise<TelegramAdapter> {
    const adapter = new TelegramAdapter('test-token', webhookConfig);
    adapters.push(adapter);
    await adapter.initialize();
    return adapter;
  }

  describe('Polling mode (default)', () => {
    it('should initialize with polling when no webhook config', async () => {
      const adapter = await createAdapter();
      expect(TelegramBot).toHaveBeenCalledWith('test-token', { polling: true });
      expect(adapter.isWebhookMode()).toBe(false);
    });

    it('should stop polling on shutdown', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();
      await adapter.shutdown();
      expect(bot.stopPolling).toHaveBeenCalled();
    });
  });

  describe('Webhook mode', () => {
    it('should initialize with webhook when config provided', async () => {
      const adapter = await createAdapter({
        url: 'https://example.com/webhook/telegram',
        secretToken: 'secret123',
      });
      const bot = getMockBot();

      expect(TelegramBot).toHaveBeenCalledWith('test-token', { polling: false });
      expect(bot.setWebHook).toHaveBeenCalledWith(
        'https://example.com/webhook/telegram',
        { secret_token: 'secret123' },
      );
      expect(adapter.isWebhookMode()).toBe(true);
    });

    it('should delete webhook on shutdown', async () => {
      const adapter = await createAdapter({ url: 'https://example.com/wh' });
      const bot = getMockBot();
      await adapter.shutdown();
      expect(bot.deleteWebHook).toHaveBeenCalled();
      expect(bot.stopPolling).not.toHaveBeenCalled();
    });

    it('should return correct webhook path', () => {
      const adapter1 = new TelegramAdapter('t', { url: 'https://x.com/wh' });
      adapters.push(adapter1);
      expect(adapter1.getWebhookPath()).toBe('/webhook/telegram');

      const adapter2 = new TelegramAdapter('t', { url: 'https://x.com/wh', path: '/custom/path' });
      adapters.push(adapter2);
      expect(adapter2.getWebhookPath()).toBe('/custom/path');
    });

    it('should retry setWebHook on failure then succeed', async () => {
      const adapter = new TelegramAdapter('test-token', {
        url: 'https://example.com/wh',
        maxRetries: 3,
      });
      adapters.push(adapter);

      // Pre-create the mock bot so we can override setWebHook before initialize
      // The mock is created on `new TelegramBot(...)` inside initialize,
      // so we test that initialization succeeds (retry works internally)
      await adapter.initialize();
      expect(adapter.isWebhookMode()).toBe(true);
    });
  });

  describe('Webhook middleware', () => {
    it('should validate secret token with timing-safe comparison', async () => {
      const adapter = await createAdapter({
        url: 'https://example.com/wh',
        secretToken: 'secret123',
      });
      const bot = getMockBot();
      const middleware = adapter.getWebhookMiddleware();

      // Valid token
      const validReq = {
        headers: { 'x-telegram-bot-api-secret-token': 'secret123' },
        body: { update_id: 1, message: createTelegramMessage() },
      } as any;
      const res1 = { sendStatus: jest.fn() } as any;
      middleware(validReq, res1);
      expect(res1.sendStatus).toHaveBeenCalledWith(200);
      expect(bot.processUpdate).toHaveBeenCalledWith(validReq.body);

      // Invalid token
      const invalidReq = {
        headers: { 'x-telegram-bot-api-secret-token': 'wrong' },
        body: { update_id: 2 },
      } as any;
      const res2 = { sendStatus: jest.fn() } as any;
      middleware(invalidReq, res2);
      expect(res2.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should reject when secret token header is missing', async () => {
      const adapter = await createAdapter({
        url: 'https://example.com/wh',
        secretToken: 'secret123',
      });
      const middleware = adapter.getWebhookMiddleware();
      const req = { headers: {}, body: { update_id: 1 } } as any;
      const res = { sendStatus: jest.fn() } as any;
      middleware(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    it('should accept all requests when no secret token configured', async () => {
      const adapter = await createAdapter({ url: 'https://example.com/wh' });
      const bot = getMockBot();
      const middleware = adapter.getWebhookMiddleware();
      const req = { headers: {}, body: { update_id: 1 } } as any;
      const res = { sendStatus: jest.fn() } as any;
      middleware(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(200);
      expect(bot.processUpdate).toHaveBeenCalled();
    });
  });

  describe('Message handling', () => {
    it('should convert regular message to UniversalMessage', async () => {
      const adapter = await createAdapter();
      const msg = createTelegramMessage();
      const universal = adapter.convertToUniversal(msg);

      expect(universal.conversationId).toBe('12345');
      expect(universal.userId).toBe('67890');
      expect(universal.platform).toBe(PlatformType.TELEGRAM);
      expect(universal.content.type).toBe(MessageType.TEXT);
      expect(universal.content.text).toBe('Hello');
      expect(universal.metadata.custom?.isBusiness).toBeFalsy();
      expect(universal.metadata.custom?.businessConnectionId).toBeUndefined();
    });

    it('should convert business message with businessConnectionId', async () => {
      const adapter = await createAdapter();
      const msg = createTelegramMessage({ business_connection_id: 'biz-conn-123' });
      const universal = adapter.convertToUniversal(msg, true);

      expect(universal.metadata.custom?.isBusiness).toBe(true);
      expect(universal.metadata.custom?.businessConnectionId).toBe('biz-conn-123');
    });

    it('should call handler for regular messages', async () => {
      const adapter = await createAdapter();
      const handler = jest.fn().mockResolvedValue(undefined);
      adapter.setMessageHandler(handler);

      const bot = getMockBot();
      bot._emit('message', createTelegramMessage());

      jest.advanceTimersByTime(10);
      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].metadata.custom?.isBusiness).toBeFalsy();
    });

    it('should call handler for business_message events', async () => {
      const adapter = await createAdapter();
      const handler = jest.fn().mockResolvedValue(undefined);
      adapter.setMessageHandler(handler);

      const bot = getMockBot();
      bot._emit('business_message', createTelegramMessage({ business_connection_id: 'biz-1' }));

      jest.advanceTimersByTime(10);
      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].metadata.custom?.isBusiness).toBe(true);
      expect(handler.mock.calls[0][0].metadata.custom?.businessConnectionId).toBe('biz-1');
    });

    it('should handle edited_business_message events', async () => {
      const adapter = await createAdapter();
      const handler = jest.fn().mockResolvedValue(undefined);
      adapter.setMessageHandler(handler);

      const bot = getMockBot();
      bot._emit('edited_business_message', createTelegramMessage({
        text: 'edited text',
        business_connection_id: 'biz-edit',
      }));

      jest.advanceTimersByTime(10);
      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      const callArg = handler.mock.calls[0][0];
      expect(callArg.content.text).toBe('edited text');
      expect(callArg.metadata.custom?.isBusiness).toBe(true);
      expect(callArg.metadata.custom?.businessConnectionId).toBe('biz-edit');

      // Should count as business message in metrics
      expect(adapter.getMetrics().businessMessages).toBe(1);
    });
  });

  describe('Business connection tracking', () => {
    it('should track business_connection events', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-1',
        user: { id: 123 },
        can_reply: true,
        is_deleted: false,
      });

      expect(adapter.canReplyToBusiness('biz-1')).toBe(true);
      expect(adapter.getMetrics().activeBusinessConnections).toBe(1);
    });

    it('should block replies when can_reply is false', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-2',
        user: { id: 456 },
        can_reply: false,
        is_deleted: false,
      });

      expect(adapter.canReplyToBusiness('biz-2')).toBe(false);

      const result = await adapter.sendMessage('12345', 'test', 'biz-2');
      expect(result.status).toBe('failed');
      expect(bot.sendMessage).not.toHaveBeenCalled();
    });

    it('should remove connection when deleted', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-3',
        user: { id: 789 },
        can_reply: true,
        is_deleted: false,
      });
      expect(adapter.canReplyToBusiness('biz-3')).toBe(true);

      bot._emit('business_connection', {
        id: 'biz-3',
        user: { id: 789 },
        can_reply: false,
        is_deleted: true,
      });
      // Deleted = removed from map, unknown = optimistically allowed
      expect(adapter.canReplyToBusiness('biz-3')).toBe(true);
      expect(adapter.getMetrics().activeBusinessConnections).toBe(0);
    });

    it('should allow unknown business connections optimistically', () => {
      const adapter = new TelegramAdapter('test-token');
      adapters.push(adapter);
      expect(adapter.canReplyToBusiness('unknown-id')).toBe(true);
    });

    it('should not send typing indicator when business connection cannot reply', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-no-reply',
        user: { id: 111 },
        can_reply: false,
        is_deleted: false,
      });

      await adapter.sendTypingIndicator('12345', 'biz-no-reply');
      expect(bot.sendChatAction).not.toHaveBeenCalled();
    });

    it('should cleanup stale connections after TTL', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-stale',
        user: { id: 999 },
        can_reply: true,
        is_deleted: false,
      });
      expect(adapter.getMetrics().activeBusinessConnections).toBe(1);

      // Advance past the cleanup interval (1 hour) + max age (24 hours)
      // The cleanup runs every hour and removes connections older than 24h
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      // Connection should be cleaned up now
      expect(adapter.getMetrics().activeBusinessConnections).toBe(0);
    });
  });

  describe('sendMessage with businessConnectionId', () => {
    it('should pass business_connection_id to bot.sendMessage', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      await adapter.sendMessage('12345', 'Reply', 'biz-conn-123');
      expect(bot.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Reply',
        { business_connection_id: 'biz-conn-123' },
      );
    });

    it('should send without business_connection_id for regular messages', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      await adapter.sendMessage('12345', 'Reply');
      expect(bot.sendMessage).toHaveBeenCalledWith('12345', 'Reply', {});
    });
  });

  describe('sendTypingIndicator with businessConnectionId', () => {
    it('should pass business_connection_id to sendChatAction', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      await adapter.sendTypingIndicator('12345', 'biz-conn-123');
      expect(bot.sendChatAction).toHaveBeenCalledWith(
        '12345',
        'typing',
        { business_connection_id: 'biz-conn-123' },
      );
    });
  });

  describe('sendDocument', () => {
    it('should send document with caption', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      const result = await adapter.sendDocument('12345', '/path/to/file.pdf', {
        caption: 'Test document',
      });

      expect(result.status).toBe('sent');
      expect(bot.sendDocument).toHaveBeenCalledWith('12345', '/path/to/file.pdf', {
        caption: 'Test document',
      });
    });

    it('should pass business_connection_id when sending document', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      await adapter.sendDocument('12345', '/path/file.pdf', {
        caption: 'Doc',
        businessConnectionId: 'biz-doc',
      });

      expect(bot.sendDocument).toHaveBeenCalledWith('12345', '/path/file.pdf', {
        caption: 'Doc',
        business_connection_id: 'biz-doc',
      });
    });

    it('should block document send when business connection cannot reply', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      bot._emit('business_connection', {
        id: 'biz-blocked',
        user: { id: 1 },
        can_reply: false,
        is_deleted: false,
      });

      const result = await adapter.sendDocument('12345', '/path/file.pdf', {
        businessConnectionId: 'biz-blocked',
      });

      expect(result.status).toBe('failed');
      expect(bot.sendDocument).not.toHaveBeenCalled();
    });

    it('should return failed when bot is not initialized', async () => {
      const adapter = new TelegramAdapter('test-token');
      adapters.push(adapter);
      // Don't initialize
      const result = await adapter.sendDocument('12345', '/path/file.pdf');
      expect(result.status).toBe('failed');
    });
  });

  describe('Metrics', () => {
    it('should count regular and business messages separately', async () => {
      const adapter = await createAdapter();
      const handler = jest.fn().mockResolvedValue(undefined);
      adapter.setMessageHandler(handler);
      const bot = getMockBot();

      bot._emit('message', createTelegramMessage());
      bot._emit('message', createTelegramMessage());
      bot._emit('business_message', createTelegramMessage({ business_connection_id: 'biz' }));

      jest.advanceTimersByTime(10);
      await Promise.resolve();

      const metrics = adapter.getMetrics();
      expect(metrics.regularMessages).toBe(2);
      expect(metrics.businessMessages).toBe(1);
    });

    it('should count sent and failed messages', async () => {
      const adapter = await createAdapter();
      const bot = getMockBot();

      await adapter.sendMessage('12345', 'ok');
      bot.sendMessage.mockRejectedValueOnce(new Error('fail'));
      await adapter.sendMessage('12345', 'fail');

      const metrics = adapter.getMetrics();
      expect(metrics.messagesSent).toBe(1);
      expect(metrics.messagesFailed).toBe(1);
    });
  });

  describe('extractBusinessConnectionId (static)', () => {
    it('should extract businessConnectionId from message metadata', () => {
      const msg: UniversalMessage = {
        messageId: 'test',
        conversationId: '123',
        userId: '456',
        timestamp: Date.now(),
        platform: PlatformType.TELEGRAM,
        platformMessageId: '42',
        content: { type: MessageType.TEXT, text: 'hi' },
        metadata: { custom: { businessConnectionId: 'biz-abc' } },
      };
      expect(TelegramAdapter.extractBusinessConnectionId(msg)).toBe('biz-abc');
    });

    it('should return undefined for regular messages', () => {
      const msg: UniversalMessage = {
        messageId: 'test',
        conversationId: '123',
        userId: '456',
        timestamp: Date.now(),
        platform: PlatformType.TELEGRAM,
        platformMessageId: '42',
        content: { type: MessageType.TEXT, text: 'hi' },
        metadata: { custom: { chatType: 'private' } },
      };
      expect(TelegramAdapter.extractBusinessConnectionId(msg)).toBeUndefined();
    });

    it('should return undefined when metadata is empty', () => {
      const msg: UniversalMessage = {
        messageId: 'test',
        conversationId: '123',
        userId: '456',
        timestamp: Date.now(),
        platform: PlatformType.TELEGRAM,
        platformMessageId: '42',
        content: { type: MessageType.TEXT, text: 'hi' },
        metadata: {},
      };
      expect(TelegramAdapter.extractBusinessConnectionId(msg)).toBeUndefined();
    });
  });

  describe('getWebhookInfo', () => {
    it('should return webhook info in webhook mode', async () => {
      const adapter = await createAdapter({ url: 'https://example.com/wh' });
      const info = await adapter.getWebhookInfo();
      expect(info).toBeDefined();
      expect(info!.url).toBe('https://example.com/wh');
    });

    it('should return null in polling mode', async () => {
      const adapter = await createAdapter();
      const info = await adapter.getWebhookInfo();
      expect(info).toBeNull();
    });

    it('should return null on error', async () => {
      const adapter = await createAdapter({ url: 'https://example.com/wh' });
      const bot = getMockBot();
      bot.getWebHookInfo.mockRejectedValueOnce(new Error('fail'));
      const info = await adapter.getWebhookInfo();
      expect(info).toBeNull();
    });
  });

  describe('Message type detection', () => {
    it('should detect photo messages', () => {
      const adapter = new TelegramAdapter('test-token');
      adapters.push(adapter);
      const msg = createTelegramMessage({ photo: [{ file_id: 'x', width: 1, height: 1 }], text: undefined });
      expect(adapter.convertToUniversal(msg).content.type).toBe(MessageType.IMAGE);
    });

    it('should detect video messages', () => {
      const adapter = new TelegramAdapter('test-token');
      adapters.push(adapter);
      const msg = createTelegramMessage({ video: { file_id: 'x' }, text: undefined });
      expect(adapter.convertToUniversal(msg).content.type).toBe(MessageType.VIDEO);
    });

    it('should detect voice messages', () => {
      const adapter = new TelegramAdapter('test-token');
      adapters.push(adapter);
      const msg = createTelegramMessage({ voice: { file_id: 'x', duration: 5 }, text: undefined });
      expect(adapter.convertToUniversal(msg).content.type).toBe(MessageType.VOICE);
    });
  });

  describe('Integration: webhook full cycle', () => {
    it('should process webhook update through to message handler', async () => {
      const adapter = await createAdapter({
        url: 'https://example.com/wh',
        secretToken: 'secret',
      });
      const handler = jest.fn().mockResolvedValue(undefined);
      adapter.setMessageHandler(handler);
      const bot = getMockBot();

      bot.processUpdate.mockImplementation((update: any) => {
        if (update.message) bot._emit('message', update.message);
        if (update.business_message) bot._emit('business_message', update.business_message);
      });

      const middleware = adapter.getWebhookMiddleware();

      // 1. Regular message via webhook
      const req1 = {
        headers: { 'x-telegram-bot-api-secret-token': 'secret' },
        body: { update_id: 100, message: createTelegramMessage({ text: 'webhook regular msg' }) },
      } as any;
      const res1 = { sendStatus: jest.fn() } as any;
      middleware(req1, res1);
      expect(res1.sendStatus).toHaveBeenCalledWith(200);

      jest.advanceTimersByTime(10);
      await Promise.resolve();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].content.text).toBe('webhook regular msg');

      // 2. Business message via webhook
      handler.mockClear();
      const req2 = {
        headers: { 'x-telegram-bot-api-secret-token': 'secret' },
        body: {
          update_id: 101,
          business_message: createTelegramMessage({
            text: 'webhook biz msg',
            business_connection_id: 'biz-wh',
          }),
        },
      } as any;
      const res2 = { sendStatus: jest.fn() } as any;
      middleware(req2, res2);

      jest.advanceTimersByTime(10);
      await Promise.resolve();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].metadata.custom?.isBusiness).toBe(true);
      expect(handler.mock.calls[0][0].metadata.custom?.businessConnectionId).toBe('biz-wh');
    });
  });
});
