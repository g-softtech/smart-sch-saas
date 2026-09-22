import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainEventPublisher } from './DomainEventPublisher';
import { DomainEvent } from './DomainEvent.types';

@Injectable()
export class EventDispatcher {
  private readonly logger = new Logger(EventDispatcher.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: DomainEventPublisher
  ) {}

  /**
   * Reads pending events, publishes them securely, and marks them processed.
   * Batch size ensures we don't overwhelm memory.
   */
  async dispatchPending(batchSize = 100): Promise<number> {
    let processedCount = 0;

    // Atomic claim of pending, due-for-retry, or abandoned processing events
    const claimedRows = await this.prisma.$queryRaw<any[]>`
      UPDATE "OutboxQueue"
      SET
        status = 'PROCESSING'::"OutboxStatus",
        "lastAttemptAt" = NOW()
      WHERE id IN (
        SELECT id
        FROM "OutboxQueue"
        WHERE status = 'PENDING'::"OutboxStatus"
           OR (status = 'FAILED'::"OutboxStatus" AND "nextAttemptAt" <= NOW())
           OR (status = 'PROCESSING'::"OutboxStatus" AND "lastAttemptAt" <= NOW() - INTERVAL '5 minutes')
        ORDER BY "aggregateId" ASC, "nextAttemptAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return 0;
    }

    const pendingMessages = claimedRows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      status: row.status,
      attempts: row.attempts,
      lastAttemptAt: row.lastAttemptAt,
      nextAttemptAt: row.nextAttemptAt,
      errorMessage: row.errorMessage,
      aggregateId: row.aggregateId,
      tenantId: row.tenantId
    }));

    for (const msg of pendingMessages) {
      try {
        // Fetch the permanent event log to get the payload
        const eventLog = await this.prisma.domainEventLog.findUnique({
          where: { eventId: msg.eventId }
        });

        if (!eventLog) {
          throw new Error(`DomainEventLog not found for eventId: ${msg.eventId}`);
        }

        // Reconstruct event payload
        const eventPayload = {
          eventId: eventLog.eventId,
          eventType: eventLog.eventType,
          aggregateId: eventLog.aggregateId,
          aggregateType: eventLog.aggregateType,
          version: eventLog.version,
          occurredAt: eventLog.occurredAt,
          correlationId: eventLog.correlationId,
          causationId: eventLog.causationId,
          tenantId: eventLog.tenantId,
          payload: eventLog.payload,
        } as unknown as DomainEvent;
        
        // Publish through abstract transport
        await this.publisher.publish(eventPayload);

        // Mark processed
        await this.prisma.outboxQueue.update({
          where: { id: msg.id },
          data: { status: 'COMPLETED' }
        });
        processedCount++;

      } catch (error: any) {
        this.logger.error(`Failed to dispatch outbox message ${msg.id}`, error);
        
        const nextAttempts = msg.attempts + 1;
        const maxAttempts = 5;
        const isQuarantined = nextAttempts >= maxAttempts;
        
        // Exponential backoff: 2^attempts minutes
        const backoffMinutes = Math.pow(2, nextAttempts);
        const nextAttemptAt = new Date();
        nextAttemptAt.setMinutes(nextAttemptAt.getMinutes() + backoffMinutes);

        // Mark failed or quarantined, do not mutate payload
        await this.prisma.outboxQueue.update({
          where: { id: msg.id },
          data: { 
            status: isQuarantined ? 'QUARANTINED' : 'FAILED',
            attempts: nextAttempts,
            lastAttemptAt: new Date(),
            nextAttemptAt: nextAttemptAt,
            errorMessage: error?.message || 'Unknown error during dispatch'
          }
        });
      }
    }

    return processedCount;
  }

  /**
   * Resets quarantined events back to PENDING for manual replay.
   */
  async retryQuarantined(): Promise<number> {
    const result = await this.prisma.outboxQueue.updateMany({
      where: { status: 'QUARANTINED' },
      data: { status: 'PENDING', attempts: 0, errorMessage: null, nextAttemptAt: new Date() }
    });
    return result.count;
  }

  /**
   * Cleans up COMPLETED outbox messages older than a specified duration.
   */
  async cleanupProcessed(daysOld = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete from temporary delivery queue ONLY. Permanent history remains in DomainEventLog.
    const result = await this.prisma.outboxQueue.deleteMany({
      where: {
        status: 'COMPLETED',
        nextAttemptAt: { lt: cutoffDate } // Using nextAttemptAt as created proxy
      }
    });

    return result.count;
  }
}
