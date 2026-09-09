export abstract class DomainEvent<T = Record<string, any>> {
  readonly eventId!: string;
  readonly eventType!: string;
  readonly aggregateId!: string;
  readonly aggregateType!: string;
  readonly version!: number;
  readonly occurredAt!: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly tenantId?: string;
  readonly payload!: Readonly<T>;
}
