import { HandoffRepository } from '../../../src/data/repositories/handoff';
import {
  Status,
  HandoffStatus,
  HandoffPriority,
  HandoffReasonType,
  RiskLevel,
  DateRange,
} from '../../../src/types';
import { createTestHandoff } from '../../fixtures/test-data';

describe('HandoffRepository', () => {
  let repo: HandoffRepository;

  beforeEach(() => {
    repo = new HandoffRepository();
  });

  describe('create', () => {
    it('creates a handoff and returns SUCCESS', () => {
      const handoff = createTestHandoff();
      const result = repo.create(handoff);

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.handoffId).toBe(handoff.handoffId);
    });

    it('rejects duplicate handoff', () => {
      const handoff = createTestHandoff();
      repo.create(handoff);

      const duplicate = repo.create(handoff);
      expect(duplicate.status).toBe(Status.ERROR);
      expect(duplicate.error?.code).toBe('DUPLICATE');
    });
  });

  describe('get', () => {
    it('returns a handoff by id', () => {
      const handoff = createTestHandoff();
      repo.create(handoff);

      const result = repo.get(handoff.handoffId);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.handoffId).toBe(handoff.handoffId);
    });

    it('returns error for missing handoff', () => {
      const result = repo.get('nonexistent');
      expect(result.status).toBe(Status.ERROR);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('update', () => {
    it('updates fields on an existing handoff', () => {
      const handoff = createTestHandoff();
      repo.create(handoff);

      const result = repo.update(handoff.handoffId, { priority: HandoffPriority.URGENT });
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.priority).toBe(HandoffPriority.URGENT);
    });

    it('returns error for missing handoff', () => {
      const result = repo.update('nonexistent', {});
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('delete', () => {
    it('removes a handoff', () => {
      const handoff = createTestHandoff();
      repo.create(handoff);

      const deleteResult = repo.delete(handoff.handoffId);
      expect(deleteResult.status).toBe(Status.SUCCESS);

      const getResult = repo.get(handoff.handoffId);
      expect(getResult.status).toBe(Status.ERROR);
    });

    it('returns error for missing handoff', () => {
      const result = repo.delete('nonexistent');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('findByConversation', () => {
    it('filters by conversationId', () => {
      repo.create(createTestHandoff({ handoffId: 'h1', conversationId: 'conv-1' }));
      repo.create(createTestHandoff({ handoffId: 'h2', conversationId: 'conv-2' }));
      repo.create(createTestHandoff({ handoffId: 'h3', conversationId: 'conv-1' }));

      const result = repo.findByConversation('conv-1');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('findByStatus', () => {
    it('filters by status', () => {
      repo.create(createTestHandoff({ handoffId: 'h1', status: HandoffStatus.PENDING }));
      repo.create(createTestHandoff({ handoffId: 'h2', status: HandoffStatus.RESOLVED }));
      repo.create(createTestHandoff({ handoffId: 'h3', status: HandoffStatus.PENDING }));

      const result = repo.findByStatus(HandoffStatus.PENDING);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('findByPriority', () => {
    it('filters by priority', () => {
      repo.create(createTestHandoff({ handoffId: 'h1', priority: HandoffPriority.URGENT }));
      repo.create(createTestHandoff({ handoffId: 'h2', priority: HandoffPriority.LOW }));
      repo.create(createTestHandoff({ handoffId: 'h3', priority: HandoffPriority.URGENT }));

      const result = repo.findByPriority(HandoffPriority.URGENT);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('getPending', () => {
    it('returns PENDING and NOTIFIED handoffs', () => {
      repo.create(createTestHandoff({ handoffId: 'h1', status: HandoffStatus.PENDING }));
      repo.create(createTestHandoff({ handoffId: 'h2', status: HandoffStatus.NOTIFIED }));
      repo.create(createTestHandoff({ handoffId: 'h3', status: HandoffStatus.RESOLVED }));
      repo.create(createTestHandoff({ handoffId: 'h4', status: HandoffStatus.ACCEPTED }));

      const result = repo.getPending();
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.length).toBe(2);
      expect(result.data!.every(
        (h) => h.status === HandoffStatus.PENDING || h.status === HandoffStatus.NOTIFIED
      )).toBe(true);
    });
  });

  describe('assign', () => {
    it('sets managerId, status=NOTIFIED, and notifiedAt', () => {
      const handoff = createTestHandoff({ status: HandoffStatus.PENDING });
      repo.create(handoff);

      const result = repo.assign(handoff.handoffId, 'manager-001');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.assignedTo).toBe('manager-001');
      expect(result.data!.status).toBe(HandoffStatus.NOTIFIED);
      expect(result.data!.notifiedAt).toBeDefined();
      expect(result.data!.notifiedAt).toBeGreaterThan(0);
    });

    it('returns error for missing handoff', () => {
      const result = repo.assign('nonexistent', 'mgr');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('accept', () => {
    it('sets acceptedBy, status=ACCEPTED, and acceptedAt', () => {
      const handoff = createTestHandoff({ status: HandoffStatus.NOTIFIED });
      repo.create(handoff);

      const result = repo.accept(handoff.handoffId, 'manager-002');
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.acceptedBy).toBe('manager-002');
      expect(result.data!.status).toBe(HandoffStatus.ACCEPTED);
      expect(result.data!.acceptedAt).toBeDefined();
      expect(result.data!.acceptedAt).toBeGreaterThan(0);
    });

    it('returns error for missing handoff', () => {
      const result = repo.accept('nonexistent', 'mgr');
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('resolve', () => {
    it('sets status=RESOLVED, resolvedAt, and resolution', () => {
      const handoff = createTestHandoff({ status: HandoffStatus.ACCEPTED });
      repo.create(handoff);

      const resolution = {
        status: 'resolved_successfully' as const,
        summary: 'Issue resolved',
        returnToAI: true,
      };

      const result = repo.resolve(handoff.handoffId, resolution);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.status).toBe(HandoffStatus.RESOLVED);
      expect(result.data!.resolvedAt).toBeDefined();
      expect(result.data!.resolvedAt).toBeGreaterThan(0);
      expect(result.data!.resolution).toEqual(resolution);
    });

    it('returns error for missing handoff', () => {
      const result = repo.resolve('nonexistent', {
        status: 'resolved_successfully',
        summary: 'test',
        returnToAI: false,
      });
      expect(result.status).toBe(Status.ERROR);
    });
  });

  describe('getStats', () => {
    it('computes stats within a date range', () => {
      const now = Date.now();
      const range: DateRange = {
        start: new Date(now - 60_000),
        end: new Date(now + 60_000),
      };

      repo.create(createTestHandoff({
        handoffId: 's1',
        initiatedAt: now,
        status: HandoffStatus.PENDING,
        priority: HandoffPriority.NORMAL,
        reason: {
          type: HandoffReasonType.COMPLEX_QUERY,
          description: 'test',
          severity: RiskLevel.MEDIUM,
          detectedBy: 'test',
        },
      }));

      repo.create(createTestHandoff({
        handoffId: 's2',
        initiatedAt: now,
        status: HandoffStatus.RESOLVED,
        priority: HandoffPriority.HIGH,
        reason: {
          type: HandoffReasonType.AI_PROBING,
          description: 'test',
          severity: RiskLevel.HIGH,
          detectedBy: 'test',
        },
        notifiedAt: now,
        acceptedAt: now + 1000,
        resolvedAt: now + 5000,
        resolution: {
          status: 'resolved_successfully',
          summary: 'Done',
          returnToAI: true,
        },
      }));

      // Handoff outside range
      repo.create(createTestHandoff({
        handoffId: 's3',
        initiatedAt: now - 200_000,
        status: HandoffStatus.PENDING,
      }));

      const result = repo.getStats(range);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.total).toBe(2);
      expect(result.data!.byStatus[HandoffStatus.PENDING]).toBe(1);
      expect(result.data!.byStatus[HandoffStatus.RESOLVED]).toBe(1);
      expect(result.data!.resolvedSuccessfully).toBe(1);
      expect(result.data!.returnedToAI).toBe(1);
    });
  });
});
