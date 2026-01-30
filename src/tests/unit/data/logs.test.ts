import { LogRepository } from '../../../src/data/repositories/logs';
import { Status, LogLevel, DateRange } from '../../../src/types';

describe('LogRepository', () => {
  let repo: LogRepository;

  beforeEach(() => {
    repo = new LogRepository();
  });

  describe('log', () => {
    it('creates an entry with generated logId and timestamp', () => {
      const result = repo.log({
        level: LogLevel.INFO,
        component: 'test',
        message: 'Test log message',
      });

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.logId).toBeDefined();
      expect(result.data!.logId).toMatch(/^log-/);
      expect(result.data!.timestamp).toBeGreaterThan(0);
      expect(result.data!.level).toBe(LogLevel.INFO);
      expect(result.data!.component).toBe('test');
      expect(result.data!.message).toBe('Test log message');
    });
  });

  describe('logMany', () => {
    it('creates multiple entries', () => {
      const result = repo.logMany([
        { level: LogLevel.INFO, component: 'a', message: 'msg1' },
        { level: LogLevel.DEBUG, component: 'b', message: 'msg2' },
        { level: LogLevel.WARNING, component: 'c', message: 'msg3' },
      ]);

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data).toBe(3);

      const all = repo.query({});
      expect(all.data!.length).toBe(3);
    });
  });

  describe('logHandoff', () => {
    it('creates entry with component=handoff', () => {
      const result = repo.logHandoff('h1', 'conv-1', 'Handoff initiated', 'Details here');

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.component).toBe('handoff');
      expect(result.data!.level).toBe(LogLevel.INFO);
      expect(result.data!.handoffId).toBe('h1');
      expect(result.data!.conversationId).toBe('conv-1');
      expect(result.data!.message).toBe('Handoff initiated');
      expect(result.data!.details).toBe('Details here');
    });
  });

  describe('logError', () => {
    it('creates entry with level=ERROR', () => {
      const result = repo.logError(
        'engine',
        'Something failed',
        'ERR_001',
        'Error stack trace',
        'conv-42'
      );

      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data!.level).toBe(LogLevel.ERROR);
      expect(result.data!.component).toBe('engine');
      expect(result.data!.message).toBe('Something failed');
      expect(result.data!.errorCode).toBe('ERR_001');
      expect(result.data!.stackTrace).toBe('Error stack trace');
      expect(result.data!.conversationId).toBe('conv-42');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      repo.log({ level: LogLevel.INFO, component: 'core', message: 'Info msg', conversationId: 'c1' });
      repo.log({ level: LogLevel.ERROR, component: 'engine', message: 'Error msg', conversationId: 'c2' });
      repo.log({ level: LogLevel.WARNING, component: 'core', message: 'Warning msg', conversationId: 'c1' });
      repo.log({ level: LogLevel.DEBUG, component: 'data', message: 'Debug msg' });
      repo.log({ level: LogLevel.INFO, component: 'engine', message: 'Another info' });
    });

    it('filters by levels', () => {
      const result = repo.query({ levels: [LogLevel.INFO] });
      expect(result.data!.length).toBe(2);
      expect(result.data!.every((e) => e.level === LogLevel.INFO)).toBe(true);
    });

    it('filters by components', () => {
      const result = repo.query({ components: ['core'] });
      expect(result.data!.length).toBe(2);
    });

    it('filters by conversationId', () => {
      const result = repo.query({ conversationId: 'c1' });
      expect(result.data!.length).toBe(2);
    });

    it('filters by dateRange', () => {
      const now = Date.now();
      const range: DateRange = {
        start: new Date(now - 1000),
        end: new Date(now + 1000),
      };
      const result = repo.query({ dateRange: range });
      expect(result.data!.length).toBe(5);
    });

    it('respects limit', () => {
      const result = repo.query({ limit: 2 });
      expect(result.data!.length).toBe(2);
    });

    it('returns newest first', () => {
      const result = repo.query({});
      expect(result.data!.length).toBe(5);
      // The last logged entry should appear first
      for (let i = 0; i < result.data!.length - 1; i++) {
        expect(result.data![i].timestamp).toBeGreaterThanOrEqual(result.data![i + 1].timestamp);
      }
    });

    it('combines filters', () => {
      const result = repo.query({
        levels: [LogLevel.INFO, LogLevel.WARNING],
        components: ['core'],
      });
      expect(result.data!.length).toBe(2);
    });
  });

  describe('deleteOld', () => {
    it('removes entries before timestamp', () => {
      const now = Date.now();
      repo.log({ level: LogLevel.INFO, component: 'test', message: 'msg1' });
      repo.log({ level: LogLevel.INFO, component: 'test', message: 'msg2' });

      // Delete entries before a future timestamp (should delete all)
      const result = repo.deleteOld(now + 10_000);
      expect(result.status).toBe(Status.SUCCESS);
      expect(result.data).toBe(2);

      const remaining = repo.query({});
      expect(remaining.data!.length).toBe(0);
    });

    it('keeps entries after timestamp', () => {
      const past = Date.now() - 100_000;
      repo.log({ level: LogLevel.INFO, component: 'test', message: 'recent' });

      const result = repo.deleteOld(past);
      expect(result.data).toBe(0);

      const remaining = repo.query({});
      expect(remaining.data!.length).toBe(1);
    });
  });

  describe('trimming', () => {
    it('trims to MAX_ENTRIES (10000) when exceeded', () => {
      // Add slightly more than MAX_ENTRIES
      const entries = [];
      for (let i = 0; i < 10_005; i++) {
        entries.push({ level: LogLevel.DEBUG, component: 'bulk', message: `msg-${i}` });
      }
      repo.logMany(entries);

      const result = repo.query({});
      // After trimming, should have at most 10000
      expect(result.data!.length).toBeLessThanOrEqual(10_000);
    });
  });
});
