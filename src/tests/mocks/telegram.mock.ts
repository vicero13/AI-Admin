export function createMockTelegramAdapter() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    isWebhookMode: jest.fn().mockReturnValue(false),
    getWebhookPath: jest.fn().mockReturnValue('/webhook/telegram'),
    getWebhookMiddleware: jest.fn().mockReturnValue((_req: any, res: any) => res.sendStatus(200)),
  };
}
