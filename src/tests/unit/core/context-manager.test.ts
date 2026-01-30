import { ContextManager } from '../../../src/core/context-manager';
import {
  PlatformType,
  EmotionalState,
  ConversationMode,
  ClientType,
  MessageRole,
  MessageHandler,
} from '../../../src/types';
import { createTestMessage } from '../../fixtures/test-data';

// Mock the Logger to avoid winston dependency in tests
jest.mock('../../../src/utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  describe('createContext', () => {
    it('creates a context with defaults', () => {
      const ctx = manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      expect(ctx.conversationId).toBe('conv-1');
      expect(ctx.userId).toBe('user-1');
      expect(ctx.platform).toBe(PlatformType.TELEGRAM);
      expect(ctx.emotionalState).toBe(EmotionalState.NEUTRAL);
      expect(ctx.mode).toBe(ConversationMode.AI);
      expect(ctx.messageHistory).toEqual([]);
      expect(ctx.suspectAI).toBe(false);
      expect(ctx.complexQuery).toBe(false);
      expect(ctx.requiresHandoff).toBe(false);
      expect(ctx.sessionStarted).toBeGreaterThan(0);
      expect(ctx.lastActivity).toBeGreaterThan(0);
      expect(ctx.expiresAt).toBeGreaterThan(ctx.sessionStarted);
    });

    it('assigns clientType as NEW by default', () => {
      const ctx = manager.createContext('user-1', 'conv-1', PlatformType.WEB);
      expect(ctx.clientType).toBe(ClientType.NEW);
    });
  });

  describe('getContext', () => {
    it('returns an existing context', () => {
      manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      const ctx = manager.getContext('conv-1');
      expect(ctx.conversationId).toBe('conv-1');
      expect(ctx.userId).toBe('user-1');
    });

    it('auto-creates a new context if not found', () => {
      const ctx = manager.getContext('conv-new', 'user-new', PlatformType.WEB);

      expect(ctx.conversationId).toBe('conv-new');
      expect(ctx.userId).toBe('user-new');
      expect(ctx.platform).toBe(PlatformType.WEB);
    });

    it('uses default params when auto-creating', () => {
      const ctx = manager.getContext('conv-auto');

      expect(ctx.conversationId).toBe('conv-auto');
      expect(ctx.userId).toBe('');
      expect(ctx.platform).toBe(PlatformType.WEB);
    });
  });

  describe('updateContext', () => {
    it('merges updates into existing context', () => {
      manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      const updated = manager.updateContext('conv-1', {
        emotionalState: EmotionalState.FRUSTRATED,
        suspectAI: true,
      });

      expect(updated).toBeDefined();
      expect(updated!.emotionalState).toBe(EmotionalState.FRUSTRATED);
      expect(updated!.suspectAI).toBe(true);
      expect(updated!.conversationId).toBe('conv-1');
    });

    it('updates lastActivity on update', () => {
      const ctx = manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);
      const originalActivity = ctx.lastActivity;

      // Small delay to ensure timestamp difference
      const updated = manager.updateContext('conv-1', { complexQuery: true });
      expect(updated!.lastActivity).toBeGreaterThanOrEqual(originalActivity);
    });

    it('returns undefined for non-existent context', () => {
      const result = manager.updateContext('nonexistent', { suspectAI: true });
      expect(result).toBeUndefined();
    });
  });

  describe('addMessage', () => {
    it('adds a message to the history', () => {
      manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      const msg = createTestMessage({ messageId: 'msg-1', content: 'Hello' });
      manager.addMessage('conv-1', msg);

      const ctx = manager.getContext('conv-1');
      expect(ctx.messageHistory.length).toBe(1);
      expect(ctx.messageHistory[0].messageId).toBe('msg-1');
    });

    it('trims history at 20 messages', () => {
      manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      for (let i = 0; i < 25; i++) {
        manager.addMessage('conv-1', createTestMessage({
          messageId: `msg-${i}`,
          content: `Message ${i}`,
        }));
      }

      const ctx = manager.getContext('conv-1');
      expect(ctx.messageHistory.length).toBe(20);
      // The first 5 should have been trimmed
      expect(ctx.messageHistory[0].messageId).toBe('msg-5');
      expect(ctx.messageHistory[19].messageId).toBe('msg-24');
    });

    it('does nothing for non-existent context', () => {
      const msg = createTestMessage();
      // Should not throw
      manager.addMessage('nonexistent', msg);
    });

    it('updates lastActivity when adding a message', () => {
      const ctx = manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);
      const before = ctx.lastActivity;

      manager.addMessage('conv-1', createTestMessage());
      const after = manager.getContext('conv-1').lastActivity;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('identifyClient', () => {
    it('creates a new client profile if not found', () => {
      const profile = manager.identifyClient('user-1', PlatformType.TELEGRAM);

      expect(profile.userId).toBe('user-1');
      expect(profile.platform).toBe(PlatformType.TELEGRAM);
      expect(profile.type).toBe(ClientType.NEW);
      expect(profile.totalConversations).toBe(1);
    });

    it('returns existing client and increments conversations', () => {
      manager.identifyClient('user-1', PlatformType.TELEGRAM);
      const second = manager.identifyClient('user-1', PlatformType.TELEGRAM);

      expect(second.totalConversations).toBe(2);
    });

    it('updates lastContact for existing client', () => {
      const first = manager.identifyClient('user-1', PlatformType.TELEGRAM);
      const firstContact = first.lastContact;

      const second = manager.identifyClient('user-1', PlatformType.TELEGRAM);
      expect(second.lastContact).toBeGreaterThanOrEqual(firstContact);
    });
  });

  describe('expireOldContexts', () => {
    it('removes contexts older than the given timestamp', () => {
      const now = Date.now();

      // Create contexts with different last activity times
      const ctx1 = manager.createContext('user-1', 'old-conv', PlatformType.TELEGRAM);
      // Manually set lastActivity to the past
      manager.updateContext('old-conv', {} as any);
      const oldCtx = manager.getContext('old-conv');
      // Force set lastActivity to a past value through internal access
      (oldCtx as any).lastActivity = now - 100_000;

      manager.createContext('user-2', 'new-conv', PlatformType.WEB);

      const expiredCount = manager.expireOldContexts(now - 50_000);

      expect(expiredCount).toBe(1);

      // old-conv should be gone (auto-creates if we call getContext)
      // new-conv should still exist
      const newCtx = manager.getContext('new-conv');
      expect(newCtx.userId).toBe('user-2');
    });

    it('returns 0 when no contexts expired', () => {
      manager.createContext('user-1', 'conv-1', PlatformType.TELEGRAM);

      const count = manager.expireOldContexts(Date.now() - 100_000);
      expect(count).toBe(0);
    });

    it('returns correct count when all contexts expired', () => {
      const now = Date.now();

      manager.createContext('u1', 'c1', PlatformType.TELEGRAM);
      manager.createContext('u2', 'c2', PlatformType.WEB);

      // Force both to be old
      const c1 = manager.getContext('c1');
      const c2 = manager.getContext('c2');
      (c1 as any).lastActivity = now - 200_000;
      (c2 as any).lastActivity = now - 200_000;

      const count = manager.expireOldContexts(now - 100_000);
      expect(count).toBe(2);
    });
  });
});
