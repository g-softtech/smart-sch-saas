import { DomainEvent } from './DomainEvent.types';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class DomainEventPublisher {
  abstract publish(event: DomainEvent): Promise<void>;
}

@Injectable()
export class EventEmitterPublisher extends DomainEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async publish(event: DomainEvent): Promise<void> {
    this.eventEmitter.emit(event.eventType, event);
  }
}
