import { ConversationRepository } from '../../../src/data/repositories/conversation';
import { Status } from '../../../src/types';
import { createTestConversation, createTestMessage } from '../../fixtures/test-data';

describe('ConversationRepository', () => {
  let repo: ConversationRepository;

  beforeEach(() => {
    repo = new ConversationRepository();
  });

  describe('create', () => {
    it('creates a conversation and returns SUCCESS', () => {
      const conv = createTestConversation();
      const result = repo.create(conv);

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data).toBeDefined();
      expect(result.data!.conversationId).toBe(conv.conversationId);
    });

    it('rejects duplicate conversation', () => {
      const conv = createTestConversation();
      repo.create(conv);

      const duplicate = repo.create(conv);
      expect(duplicate.status).toBe(Status.ERROR);
      expect(duplicate.error?.code).toBe('DUPLICATE');
    });
  });

  describe('get', () => {
    it('returns a conversation by id', () => {
      const conv = createTestConversation();
      repo.create(conv);

      const result = repo.get(conv.conversationId);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.conversationId).toBe(conv.conversationId);
    });

    it('returns error for missing conversation', () => {
      const result = repo.get('nonexistent');
      expect(result.status).toBe(Status.ERROR);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('update', () => {
    it('updates fields on an existing conversation', () => {
      const conv = createTestConversation();
      repo.create(conv);

      const result = repo.update(conv.conversationId, { active: false });
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.active).toBe(false);
      expect(result.data!.updatedAt).toBeGreaterThanOrEqual(conv.updatedAt);
    });

    it('returns error for missing conversation', () => {
      const result = repo.update('nonexistent', { active: false });
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('delete', () => {
    it('removes conversation and messages', () => {
      const conv = createTestConversation();
      repo.create(conv);

      const msg = createTestMessage({ messageId: 'msg-del-1' });
      repo.addMessage(conv.conversationId, msg);

      const deleteResult = repo.delete(conv.conversationId);
      expect(deleteResult.status).toBe(Status.SUCCESS);
      expect(deleteResult.data).toBe(true);

      const getResult = repo.get(conv.conversationId);
      expect(getResult.status).toBe(Status.ERROR);

      const msgsResult = repo.getMessages(conv.conversationId);
      expect(msgsResult.status).toBe(Status.ERROR);
    });

    it('returns error for missing conversation', () => {
      const result = repo.delete('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('findByUserId', () => {
    it('filters conversations by userId', () => {
      repo.create(createTestConversation({ conversationId: 'c1', userId: 'user-A' }));
      repo.create(createTestConversation({ conversationId: 'c2', userId: 'user-B' }));
      repo.create(createTestConversation({ conversationId: 'c3', userId: 'user-A' }));

      const result = repo.findByUserId('user-A');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
      expect(result.data!.every((c) => c.userId === 'user-A')).toBe(true);
    });

    it('returns empty array when no matches', () => {
      const result = repo.findByUserId('no-such-user');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(0);
    });
  });

  describe('findActive', () => {
    it('returns only active conversations', () => {
      repo.create(createTestConversation({ conversationId: 'active-1', active: true }));
      repo.create(createTestConversation({ conversationId: 'inactive-1', active: false }));
      repo.create(createTestConversation({ conversationId: 'active-2', active: true }));

      const result = repo.findActive();
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
      expect(result.data!.every((c) => c.active)).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('adds a message and updates timestamps', () => {
      const conv = createTestConversation();
      repo.create(conv);

      const msg = createTestMessage({ messageId: 'msg-add-1' });
      const result = repo.addMessage(conv.conversationId, msg);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.messageId).toBe('msg-add-1');

      const updated = repo.get(conv.conversationId);
      expect(updated.data!.lastMessageAt).toBeGreaterThanOrEqual(conv.lastMessageAt);
    });

    it('returns error for missing conversation', () => {
      const msg = createTestMessage();
      const result = repo.addMessage('nonexistent', msg);
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('getMessages', () => {
    it('returns messages in order', () => {
      const conv = createTestConversation();
      repo.create(conv);

      repo.addMessage(conv.conversationId, createTestMessage({ messageId: 'm1', content: 'first' }));
      repo.addMessage(conv.conversationId, createTestMessage({ messageId: 'm2', content: 'second' }));
      repo.addMessage(conv.conversationId, createTestMessage({ messageId: 'm3', content: 'third' }));

      const result = repo.getMessages(conv.conversationId);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(3);
      expect(result.data![0].messageId).toBe('m1');
      expect(result.data![1].messageId).toBe('m2');
      expect(result.data![2].messageId).toBe('m3');
    });

    it('returns error for missing conversation', () => {
      const result = repo.getMessages('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('clearMessages', () => {
    it('empties the message list', () => {
      const conv = createTestConversation();
      repo.create(conv);
      repo.addMessage(conv.conversationId, createTestMessage({ messageId: 'cm1' }));
      repo.addMessage(conv.conversationId, createTestMessage({ messageId: 'cm2' }));

      const clearResult = repo.clearMessages(conv.conversationId);
      expect(clearResult.status).toBe(Status.SUCCESS);

      const msgs = repo.getMessages(conv.conversationId);
      expect(msgs.data!.length).toBe(0);
    });

    it('returns error for missing conversation', () => {
      const result = repo.clearMessages('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('close', () => {
    it('sets active=false and closedAt', () => {
      const conv = createTestConversation({ active: true });
      repo.create(conv);

      const result = repo.close(conv.conversationId);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.active).toBe(false);
      expect(result.data!.closedAt).toBeDefined();
      expect(result.data!.closedAt).toBeGreaterThan(0);
    });

    it('returns error for missing conversation', () => {
      const result = repo.close('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('closeInactive', () => {
    it('closes conversations idle longer than maxIdleMs', () => {
      const now = Date.now();
      repo.create(createTestConversation({
        conversationId: 'idle-1',
        active: true,
        lastMessageAt: now - 10_000,
      }));
      repo.create(createTestConversation({
        conversationId: 'idle-2',
        active: true,
        lastMessageAt: now - 20_000,
      }));
      repo.create(createTestConversation({
        conversationId: 'recent',
        active: true,
        lastMessageAt: now - 1_000,
      }));

      const result = repo.closeInactive(5_000);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data).toBe(2);

      const idle1 = repo.get('idle-1');
      expect(idle1.data!.active).toBe(false);

      const recent = repo.get('recent');
      expect(recent.data!.active).toBe(true);
    });
  });
});
