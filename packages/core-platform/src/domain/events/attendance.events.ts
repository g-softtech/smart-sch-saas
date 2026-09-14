import { DomainEvent } from './DomainEvent.types';

export class AttendanceRegisterFinalizedEvent extends DomainEvent<{
  registerId: string;
  schoolId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  armId: string | null;
  date: string;
  finalizedById: string;
}> {
  readonly eventType = 'AttendanceRegisterFinalizedEvent';
  readonly aggregateType = 'AttendanceRegister';
  readonly version = 1;
  
  constructor(
    public readonly aggregateId: string, 
    public readonly tenantId: string, 
    public readonly correlationId: string, 
    public readonly payload: any
  ) {
    super();
  }
}

export class StudentAbsentEvent extends DomainEvent<{
  registerId: string;
  schoolId: string;
  studentId: string;
  enrollmentId: string;
  date: string;
  reason: string | null;
}> {
  readonly eventType = 'StudentAbsentEvent';
  readonly aggregateType = 'AttendanceRecord';
  readonly version = 1;
  
  constructor(
    public readonly aggregateId: string, 
    public readonly tenantId: string, 
    public readonly correlationId: string, 
    public readonly payload: any
  ) {
    super();
  }
}
