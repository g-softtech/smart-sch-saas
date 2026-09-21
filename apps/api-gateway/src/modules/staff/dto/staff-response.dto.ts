import { StaffProfile } from "@saas/core-platform";

export class StaffResponseDto {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  designation: string | null;
  type: string;
  status: string;
  departmentId: string | null;
  schoolId: string;
  tenantId: string;
  joiningDate: Date;

  constructor(partial: Partial<StaffProfile>) {
    Object.assign(this, partial);
    // Don't leak internal IDs like userId unless explicitly requested, but keeping it simple here
  }

  static fromEntity(entity: StaffProfile): StaffResponseDto {
    const { userId, createdAt, updatedAt, dateOfBirth, gender, ...safeFields } =
      entity;
    return new StaffResponseDto(safeFields as any);
  }
}
