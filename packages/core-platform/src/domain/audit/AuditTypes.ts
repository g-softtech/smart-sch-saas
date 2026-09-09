export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditEvent {
  action: string;
  entity: string;
  entityId: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  severity: AuditSeverity;
}
