import { Injectable, NotImplementedException } from "@nestjs/common";

@Injectable()
export class CBTService {
  constructor() {}

  async startAttempt(tenantId: string, schoolId: string, studentId: string, examId: string): Promise<any> {
    throw new NotImplementedException("Phase 6C rebuild pending");
  }

  async submitAttempt(tenantId: string, schoolId: string, studentId: string, examId: string, dto: any): Promise<any> {
    throw new NotImplementedException("Phase 6C rebuild pending");
  }

  async getExamsForClass(tenantId: string, classId: string, armId?: string): Promise<any> {
    throw new NotImplementedException("Phase 6C rebuild pending");
  }
}
