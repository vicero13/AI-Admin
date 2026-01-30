export function createMockTelegramAdapter() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };
}
