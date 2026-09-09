// domain-event.ts
export interface DomainEvent {
  readonly id: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

// value-object.ts
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// entity.ts
export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(id: string, props: T) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    return this._id === object._id;
  }
}

// aggregate-root.ts
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number;

  constructor(id: string, props: T, version: number = 0) {
    super(id, props);
    this._version = version;
  }

  get version(): number {
    return this._version;
  }

  public incrementVersion(): void {
    this._version += 1;
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}

// domain-exception.ts
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

// repository.ts
export interface Repository<T extends AggregateRoot<any>> {
  save(aggregate: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  delete(aggregate: T): Promise<void>;
}

// specification.ts
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  toExpression(): any; // ORM specific translation
}

// domain-service.ts
export abstract class DomainService {}

// factory.ts
export abstract class Factory<T> {}
