import { ClientRepository } from '../../../src/data/repositories/client';
import { Status, PlatformType, ClientType } from '../../../src/types';
import { createTestClient } from '../../fixtures/test-data';

describe('ClientRepository', () => {
  let repo: ClientRepository;

  beforeEach(() => {
    repo = new ClientRepository();
  });

  describe('create', () => {
    it('creates a client and returns SUCCESS', () => {
      const client = createTestClient();
      const result = repo.create(client);

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.userId).toBe(client.userId);
    });

    it('rejects duplicate client', () => {
      const client = createTestClient();
      repo.create(client);

      const duplicate = repo.create(client);
      expect(duplicate.status).toBe(Status.ERROR);
      expect(duplicate.error?.code).toBe('DUPLICATE');
    });
  });

  describe('get', () => {
    it('returns a client by userId', () => {
      const client = createTestClient();
      repo.create(client);

      const result = repo.get(client.userId);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.name).toBe('Test User');
    });

    it('returns error for missing client', () => {
      const result = repo.get('nonexistent');
      expect(result.status).toBe(Status.ERROR);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('update', () => {
    it('updates fields on an existing client', () => {
      const client = createTestClient();
      repo.create(client);

      const result = repo.update(client.userId, { name: 'Updated Name' });
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.name).toBe('Updated Name');
    });

    it('preserves userId even if overridden in updates', () => {
      const client = createTestClient({ userId: 'original-id' });
      repo.create(client);

      const result = repo.update('original-id', { userId: 'hacked-id' } as any);
      expect(result.data!.userId).toBe('original-id');
    });

    it('returns error for missing client', () => {
      const result = repo.update('nonexistent', { name: 'X' });
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('delete', () => {
    it('removes a client', () => {
      const client = createTestClient();
      repo.create(client);

      const deleteResult = repo.delete(client.userId);
      expect(deleteResult.status).toBe(Status.SUCCESS);
      expect(deleteResult.data).toBe(true);

      const getResult = repo.get(client.userId);
      expect(getResult.status).toBe(Status.ERROR);
    });

    it('returns error for missing client', () => {
      const result = repo.delete('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('findByPlatform', () => {
    it('filters by platform', () => {
      repo.create(createTestClient({ userId: 'u1', platform: PlatformType.TELEGRAM }));
      repo.create(createTestClient({ userId: 'u2', platform: PlatformType.WHATSAPP }));
      repo.create(createTestClient({ userId: 'u3', platform: PlatformType.TELEGRAM }));

      const result = repo.findByPlatform(PlatformType.TELEGRAM);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('findByType', () => {
    it('filters by client type', () => {
      repo.create(createTestClient({ userId: 'u1', type: ClientType.NEW }));
      repo.create(createTestClient({ userId: 'u2', type: ClientType.VIP }));
      repo.create(createTestClient({ userId: 'u3', type: ClientType.VIP }));

      const result = repo.findByType(ClientType.VIP);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('findByTags', () => {
    it('finds clients by tags', () => {
      repo.create(createTestClient({ userId: 'u1', tags: ['premium', 'active'] }));
      repo.create(createTestClient({ userId: 'u2', tags: ['inactive'] }));
      repo.create(createTestClient({ userId: 'u3', tags: ['premium'] }));

      const result = repo.findByTags(['premium']);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
    });

    it('returns empty when no tags match', () => {
      repo.create(createTestClient({ userId: 'u1', tags: ['a'] }));

      const result = repo.findByTags(['nonexistent']);
      expect(result.data!.length).toBe(0);
    });
  });

  describe('search', () => {
    it('searches case-insensitively', () => {
      repo.create(createTestClient({ userId: 'u1', name: 'Alice Johnson', email: 'alice@example.com' }));
      repo.create(createTestClient({ userId: 'u2', name: 'Bob Smith', email: 'bob@example.com' }));

      const result = repo.search('alice');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].name).toBe('Alice Johnson');
    });

    it('searches by email', () => {
      repo.create(createTestClient({ userId: 'u1', email: 'test@domain.com' }));

      const result = repo.search('domain.com');
      expect(result.data!.length).toBe(1);
    });

    it('searches by tags', () => {
      repo.create(createTestClient({ userId: 'u1', tags: ['vip-customer'] }));

      const result = repo.search('vip-customer');
      expect(result.data!.length).toBe(1);
    });
  });

  describe('addTag', () => {
    it('adds a tag to a client', () => {
      repo.create(createTestClient({ userId: 'u1', tags: [] }));

      const result = repo.addTag('u1', 'new-tag');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.tags).toContain('new-tag');
    });

    it('does not add duplicate tags', () => {
      repo.create(createTestClient({ userId: 'u1', tags: ['existing'] }));

      repo.addTag('u1', 'existing');
      const result = repo.get('u1');
      const tagCount = result.data!.tags.filter((t) => t === 'existing').length;
      expect(tagCount).toBe(1);
    });

    it('returns error for missing client', () => {
      const result = repo.addTag('nonexistent', 'tag');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('removeTag', () => {
    it('removes a tag from a client', () => {
      repo.create(createTestClient({ userId: 'u1', tags: ['keep', 'remove'] }));

      const result = repo.removeTag('u1', 'remove');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.tags).toEqual(['keep']);
    });

    it('returns error for missing client', () => {
      const result = repo.removeTag('nonexistent', 'tag');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('addNote', () => {
    it('creates notes array if null and adds note', () => {
      repo.create(createTestClient({ userId: 'u1', notes: undefined }));

      const result = repo.addNote('u1', 'First note');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.notes).toEqual(['First note']);
    });

    it('appends to existing notes', () => {
      repo.create(createTestClient({ userId: 'u1', notes: ['Existing'] }));

      const result = repo.addNote('u1', 'Second');
      expect(result.data!.notes).toEqual(['Existing', 'Second']);
    });

    it('returns error for missing client', () => {
      const result = repo.addNote('nonexistent', 'note');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('updateLastActivity', () => {
    it('updates lastContact timestamp', () => {
      const oldTime = Date.now() - 100_000;
      repo.create(createTestClient({ userId: 'u1', lastContact: oldTime }));

      const result = repo.updateLastActivity('u1');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.lastContact).toBeGreaterThan(oldTime);
    });

    it('returns error for missing client', () => {
      const result = repo.updateLastActivity('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });
});
