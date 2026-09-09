import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditEvent } from './AuditTypes';
import { AuditMaskingService } from './AuditMaskingService';
import { AuditRetentionPolicy } from './AuditRetentionPolicy';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly maskingService: AuditMaskingService,
    private readonly retentionPolicy: AuditRetentionPolicy,
    // We pass the raw prisma client or a transaction client here. 
    // Usually injected via module, but we can accept it directly in logAction to support transactions.
  ) {}

  /**
   * Appends an immutable audit log. 
   * Accepts an optional Prisma transaction client (`tx`) to ensure the audit log is committed atomically with business logic.
   */
  async logAction(
    prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    event: AuditEvent
  ): Promise<any> {
    try {
      const maskedMetadata = this.maskingService.mask(event.metadata || {});
      const retentionDate = this.retentionPolicy.calculateRetentionDate(event.severity);
      const correlationId = event.correlationId || randomUUID();

      const auditRecord = await prisma.auditLog.create({
        data: {
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          tenantId: event.tenantId,
          userId: event.userId,
          metadata: maskedMetadata,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          correlationId: correlationId,
          retentionDate: retentionDate,
        }
      });

      return auditRecord;
    } catch (error) {
      // In strict compliance environments, failing to write an audit log should fail the whole transaction.
      // We log to stdout as a fallback and rethrow.
      this.logger.error(`Failed to write audit log for action: ${event.action}`, error);
      throw error;
    }
  }
}
