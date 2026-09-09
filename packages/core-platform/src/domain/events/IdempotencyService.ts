import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  /**
   * Wraps consumer execution inside a Prisma transaction, verifying idempotency.
   * If the consumer has already processed this event, the transaction is bypassed safely without side-effects.
   */
  async withIdempotency<T>(
    prisma: PrismaClient,
    consumerName: string,
    eventId: string,
    handler: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T | null> {
    const idempotencyId = createHash('sha256').update(`${consumerName}:${eventId}`).digest('hex');

    return prisma.$transaction(async (tx) => {
      // 1. Check idempotency record safely
      const existing = await tx.idempotencyRecord.findUnique({
        where: { id: idempotencyId }
      });

      if (existing) {
        this.logger.debug(`Consumer ${consumerName} already processed event ${eventId}. Skipping.`);
        return null; // Safely skip duplicate execution
      }

      // 2. Execute business logic inside transaction
      const result = await handler(tx);

      // 3. Mark processed in the same transaction
      await tx.idempotencyRecord.create({
        data: {
          id: idempotencyId,
          eventId,
          consumer: consumerName
        }
      });

      return result;
    });
  }
}
