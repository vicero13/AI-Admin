// ============================================================
// Working Hours Service — Контроль рабочего времени (v2.0)
// Новое: per-day schedule, oncePerSession auto-reply, sessionTimeout
// ============================================================

export interface DayHours {
  start: string;    // "09:00"
  end: string;      // "22:00"
  enabled: boolean; // Рабочий ли день
}

export interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;          // e.g. "Europe/Moscow"
  start: string;             // "09:00" (default для дней без отдельного расписания)
  end: string;               // "22:00"
  offHoursMessage: string;   // Сообщение вне рабочего времени
  oncePerSession: boolean;   // Отправлять auto-reply только 1 раз в сессию
  sessionTimeout: number;    // Секунды таймаута сессии (3600 = 1 час)
  schedule?: {               // Per-day расписание
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
  };
  weekends?: {
    enabled: boolean;
    start?: string;
    end?: string;
    message?: string;
  };
}

export class WorkingHoursService {
  private config: WorkingHoursConfig;
  // Трекер auto-reply: conversationId → timestamp последнего auto-reply
  private autoReplyTracker: Map<string, number> = new Map();

  constructor(config: WorkingHoursConfig) {
    this.config = config;
  }

  /**
   * Проверяет, находится ли текущее время в рабочих часах
   */
  isWithinWorkingHours(date?: Date): boolean {
    if (!this.config.enabled) return true;

    const now = date ?? new Date();
    const moscowTime = this.toTimezone(now, this.config.timezone);

    const hours = moscowTime.getHours();
    const minutes = moscowTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const dayOfWeek = moscowTime.getDay(); // 0 = воскресенье, 6 = суббота

    // Получить расписание для текущего дня
    const daySchedule = this.getDaySchedule(dayOfWeek);

    if (daySchedule) {
      if (!daySchedule.enabled) return false;
      const startMinutes = this.parseTime(daySchedule.start);
      const endMinutes = this.parseTime(daySchedule.end);
      // Если end <= start — значит рабочее время переходит через полночь (например 09:00–00:00)
      if (endMinutes <= startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    // Fallback на legacy weekends config
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (this.config.weekends && !this.config.weekends.enabled) {
        return false;
      }
      if (this.config.weekends?.start && this.config.weekends?.end) {
        const weekendStart = this.parseTime(this.config.weekends.start);
        const weekendEnd = this.parseTime(this.config.weekends.end);
        if (weekendEnd <= weekendStart) {
          return currentMinutes >= weekendStart || currentMinutes < weekendEnd;
        }
        return currentMinutes >= weekendStart && currentMinutes < weekendEnd;
      }
    }

    // Default start/end
    const startMinutes = this.parseTime(this.config.start);
    const endMinutes = this.parseTime(this.config.end);

    if (endMinutes <= startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Проверить, нужно ли отправлять auto-reply для данного разговора
   * С учётом oncePerSession: true отправляем только 1 раз за sessionTimeout
   */
  shouldSendAutoReply(conversationId: string): boolean {
    if (!this.config.oncePerSession) return true;

    const lastReply = this.autoReplyTracker.get(conversationId);
    if (!lastReply) return true;

    const elapsed = Date.now() - lastReply;
    const timeout = (this.config.sessionTimeout || 3600) * 1000;

    return elapsed >= timeout;
  }

  /**
   * Отметить, что auto-reply отправлен
   */
  markAutoReplySent(conversationId: string): void {
    this.autoReplyTracker.set(conversationId, Date.now());
  }

  /**
   * Получить сообщение для нерабочего времени
   */
  getOffHoursMessage(): string {
    return this.config.offHoursMessage;
  }

  /**
   * Расчёт времени до начала рабочего дня (мс)
   */
  getTimeUntilOpen(date?: Date): number {
    if (!this.config.enabled) return 0;

    const now = date ?? new Date();
    const moscowTime = this.toTimezone(now, this.config.timezone);

    const hours = moscowTime.getHours();
    const minutes = moscowTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const startMinutes = this.parseTime(this.config.start);
    const endMinutes = this.parseTime(this.config.end);

    if (currentMinutes < startMinutes) {
      return (startMinutes - currentMinutes) * 60 * 1000;
    } else if (currentMinutes >= endMinutes) {
      const minutesUntilMidnight = 24 * 60 - currentMinutes;
      return (minutesUntilMidnight + startMinutes) * 60 * 1000;
    }

    return 0;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // --- Private helpers ---

  private getDaySchedule(dayOfWeek: number): DayHours | null {
    if (!this.config.schedule) return null;

    const dayMap: Record<number, keyof NonNullable<WorkingHoursConfig['schedule']>> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    const dayName = dayMap[dayOfWeek];
    return this.config.schedule[dayName] || null;
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private toTimezone(date: Date, timezone: string): Date {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const get = (type: string): number => {
      const part = parts.find((p) => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };

    const result = new Date(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second')
    );

    return result;
  }
}
