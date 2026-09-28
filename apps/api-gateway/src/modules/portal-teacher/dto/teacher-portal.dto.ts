import { IsString, IsOptional, IsEmail } from "class-validator";

export class UpdateTeacherProfileDto {
  @IsString()
  @IsOptional()
  phone?: string;
}

export class TeacherProfileResponseDto {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  joiningDate: Date;
  schoolId: string;
  tenantId: string;
  hasPhoto: boolean;
  photoUrl?: string | null;
}

export class TeacherDashboardDto {
  teacherName: string;
  staffNumber: string;
  designation: string;
  hasPhoto: boolean;
  photoUrl: string | null;
  assignedClassesCount: number;
  todayPeriodsCount: number;
  totalStudentsCount: number;
  todaySchedule: Array<{
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
    className: string;
    armName?: string;
    subjectName: string;
    dayOfWeek: string;
  }>;
}
