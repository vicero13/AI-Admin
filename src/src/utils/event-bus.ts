import EventEmitter from 'eventemitter3';

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

export class EventBus {
  private emitter: EventEmitter;
  private asyncHandlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.emitter = new EventEmitter();
    this.asyncHandlers = new Map();
  }

  subscribe<T = unknown>(event: string, handler: EventHandler<T>): EventSubscription {
    const wrappedHandler = handler as EventHandler;
    this.emitter.on(event, wrappedHandler);

    if (!this.asyncHandlers.has(event)) {
      this.asyncHandlers.set(event, new Set());
    }
    this.asyncHandlers.get(event)!.add(wrappedHandler);

    return {
      unsubscribe: () => {
        this.unsubscribe(event, wrappedHandler);
      },
    };
  }

  subscribeOnce<T = unknown>(event: string, handler: EventHandler<T>): EventSubscription {
    const wrappedHandler = handler as EventHandler;
    this.emitter.once(event, wrappedHandler);

    return {
      unsubscribe: () => {
        this.unsubscribe(event, wrappedHandler);
      },
    };
  }

  publish<T = unknown>(event: string, data: T): void {
    this.emitter.emit(event, data);
  }

  async publishAsync<T = unknown>(event: string, data: T): Promise<void> {
    const handlers = this.asyncHandlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      const result = handler(data);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }

    await Promise.all(promises);
  }

  unsubscribe<T = unknown>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = handler as EventHandler;
    this.emitter.off(event, wrappedHandler);

    const handlers = this.asyncHandlers.get(event);
    if (handlers) {
      handlers.delete(wrappedHandler);
      if (handlers.size === 0) {
        this.asyncHandlers.delete(event);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.emitter.removeAllListeners(event);
      this.asyncHandlers.delete(event);
    } else {
      this.emitter.removeAllListeners();
      this.asyncHandlers.clear();
    }
  }

  listenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }

  eventNames(): string[] {
    return this.emitter.eventNames() as string[];
  }
}

export const eventBus = new EventBus();

export default eventBus;
