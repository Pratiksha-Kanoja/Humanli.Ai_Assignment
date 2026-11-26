import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventName } from './types';

class DomainEventBus extends EventEmitter {
  emit<K extends DomainEventName>(eventName: K, payload: DomainEventMap[K]): boolean {
    return super.emit(eventName, payload);
  }

  on<K extends DomainEventName>(eventName: K, listener: (payload: DomainEventMap[K]) => void): this {
    return super.on(eventName, listener);
  }
}

export const eventBus = new DomainEventBus();

