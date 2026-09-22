import { Module } from '@nestjs/common';
import { EventDispatcher, DomainEventPublisher, EventEmitterPublisher, kernel, PrismaClient } from '@saas/core-platform';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: kernel.db,
    },
    {
      provide: DomainEventPublisher,
      useClass: EventEmitterPublisher,
    },
    EventDispatcher,
    OutboxWorkerService,
  ],
})
export class OutboxWorkerModule {}
