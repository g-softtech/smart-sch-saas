import { StaffProfile } from "@saas/core-platform";

export class StaffResponseDto {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  designation: string | null;
  type: string;
  status: string;
  departmentId: string | null;
  schoolId: string;
  tenantId: string;
  joiningDate: Date;
  dateOfBirth: Date | null;
  gender: string | null;
  hasPhoto?: boolean;
  photoUrl?: string | null;

  constructor(partial: Partial<StaffProfile> & { hasPhoto?: boolean; photoUrl?: string | null }) {
    Object.assign(this, partial);
  }

  static fromEntity(entity: any): StaffResponseDto {
    const { userId, createdAt, updatedAt, photo, ...safeFields } = entity;
    const hasPhoto = !!photo || !!entity.hasPhoto;
    const photoUrl = hasPhoto ? `/api/v1/staff/${entity.id}/photo` : null;
    return new StaffResponseDto({
      ...safeFields,
      hasPhoto,
      photoUrl,
    });
  }
}
