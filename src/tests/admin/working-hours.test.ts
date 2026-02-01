import { WorkingHoursService, WorkingHoursConfig } from '../../src/core/working-hours';

describe('WorkingHoursService', () => {
  const defaultConfig: WorkingHoursConfig = {
    enabled: true,
    timezone: 'Europe/Moscow',
    start: '09:00',
    end: '22:00',
    offHoursMessage: 'Сейчас нерабочее время. Мы работаем с 9:00 до 22:00.',
    oncePerSession: true,
    sessionTimeout: 3600,
  };

  test('returns true when service is disabled', () => {
    const service = new WorkingHoursService({ ...defaultConfig, enabled: false });
    expect(service.isWithinWorkingHours()).toBe(true);
  });

  test('returns true during working hours (Moscow time)', () => {
    const service = new WorkingHoursService(defaultConfig);
    // UTC 09:00 = Moscow 12:00
    const noonMoscow = new Date('2024-06-15T09:00:00Z');
    expect(service.isWithinWorkingHours(noonMoscow)).toBe(true);
  });

  test('returns false before working hours (Moscow time)', () => {
    const service = new WorkingHoursService(defaultConfig);
    // UTC 03:00 = Moscow 06:00 (before 09:00)
    const earlyMorning = new Date('2024-06-17T03:00:00Z');
    expect(service.isWithinWorkingHours(earlyMorning)).toBe(false);
  });

  test('returns false after working hours (Moscow time)', () => {
    const service = new WorkingHoursService(defaultConfig);
    // UTC 20:00 = Moscow 23:00 (after 22:00)
    const lateEvening = new Date('2024-06-17T20:00:00Z');
    expect(service.isWithinWorkingHours(lateEvening)).toBe(false);
  });

  test('returns correct off-hours message', () => {
    const service = new WorkingHoursService(defaultConfig);
    expect(service.getOffHoursMessage()).toBe(defaultConfig.offHoursMessage);
  });

  test('getTimeUntilOpen returns 0 during working hours', () => {
    const service = new WorkingHoursService(defaultConfig);
    const noon = new Date('2024-06-17T09:00:00Z');
    expect(service.getTimeUntilOpen(noon)).toBe(0);
  });

  test('getTimeUntilOpen returns positive value before working hours', () => {
    const service = new WorkingHoursService(defaultConfig);
    const earlyMorning = new Date('2024-06-17T03:00:00Z');
    const timeUntilOpen = service.getTimeUntilOpen(earlyMorning);
    expect(timeUntilOpen).toBeGreaterThan(0);
    expect(timeUntilOpen).toBe(3 * 60 * 60 * 1000);
  });

  test('getTimeUntilOpen returns positive value after working hours', () => {
    const service = new WorkingHoursService(defaultConfig);
    const lateEvening = new Date('2024-06-17T20:00:00Z');
    const timeUntilOpen = service.getTimeUntilOpen(lateEvening);
    expect(timeUntilOpen).toBeGreaterThan(0);
    expect(timeUntilOpen).toBe(10 * 60 * 60 * 1000);
  });

  test('isEnabled returns correct value', () => {
    expect(new WorkingHoursService(defaultConfig).isEnabled()).toBe(true);
    expect(new WorkingHoursService({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });

  test('handles weekends when disabled', () => {
    const service = new WorkingHoursService({
      ...defaultConfig,
      weekends: { enabled: false },
    });
    const saturday = new Date('2024-06-15T09:00:00Z');
    expect(service.isWithinWorkingHours(saturday)).toBe(false);
  });

  test('handles weekends with custom hours', () => {
    const service = new WorkingHoursService({
      ...defaultConfig,
      weekends: { enabled: true, start: '10:00', end: '18:00' },
    });
    const saturdayNoon = new Date('2024-06-15T09:00:00Z');
    expect(service.isWithinWorkingHours(saturdayNoon)).toBe(true);

    const saturdayEarly = new Date('2024-06-15T03:00:00Z');
    expect(service.isWithinWorkingHours(saturdayEarly)).toBe(false);
  });

  // New: per-day schedule tests
  test('per-day schedule overrides default hours', () => {
    const service = new WorkingHoursService({
      ...defaultConfig,
      schedule: {
        monday: { start: '10:00', end: '20:00', enabled: true },
      },
    });
    // Monday UTC 07:01 = Moscow 10:01 (within 10-20)
    const mondayMorning = new Date('2024-06-17T07:01:00Z');
    expect(service.isWithinWorkingHours(mondayMorning)).toBe(true);

    // Monday UTC 06:30 = Moscow 09:30 (before 10:00)
    const mondayEarly = new Date('2024-06-17T06:30:00Z');
    expect(service.isWithinWorkingHours(mondayEarly)).toBe(false);
  });

  test('per-day schedule with disabled day', () => {
    const service = new WorkingHoursService({
      ...defaultConfig,
      schedule: {
        sunday: { start: '10:00', end: '18:00', enabled: false },
      },
    });
    // Sunday UTC 09:00 = Moscow 12:00
    const sunday = new Date('2024-06-16T09:00:00Z');
    expect(service.isWithinWorkingHours(sunday)).toBe(false);
  });

  // New: oncePerSession tests
  test('shouldSendAutoReply returns true first time', () => {
    const service = new WorkingHoursService(defaultConfig);
    expect(service.shouldSendAutoReply('conv-1')).toBe(true);
  });

  test('shouldSendAutoReply returns false after markAutoReplySent', () => {
    const service = new WorkingHoursService(defaultConfig);
    service.markAutoReplySent('conv-1');
    expect(service.shouldSendAutoReply('conv-1')).toBe(false);
  });

  test('shouldSendAutoReply always returns true when oncePerSession is false', () => {
    const service = new WorkingHoursService({ ...defaultConfig, oncePerSession: false });
    service.markAutoReplySent('conv-1');
    expect(service.shouldSendAutoReply('conv-1')).toBe(true);
  });

  test('different conversations have separate auto-reply tracking', () => {
    const service = new WorkingHoursService(defaultConfig);
    service.markAutoReplySent('conv-1');
    expect(service.shouldSendAutoReply('conv-1')).toBe(false);
    expect(service.shouldSendAutoReply('conv-2')).toBe(true);
  });
});
