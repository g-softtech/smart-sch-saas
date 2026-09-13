import { IsEnum, IsNotEmpty } from 'class-validator';
import { StaffStatus } from '@saas/core-platform';

export class UpdateStaffStatusDto {
  @IsEnum(StaffStatus)
  @IsNotEmpty()
  targetStatus: StaffStatus;
}
