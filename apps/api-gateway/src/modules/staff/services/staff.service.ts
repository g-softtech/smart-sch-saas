import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { StaffRepository } from "../repositories/staff.repository";
import { CreateStaffDto } from "../dto/create-staff.dto";
import { UpdateStaffDto } from "../dto/update-staff.dto";
import { StaffStatus, StaffProfile } from "@saas/core-platform";
import { kernel } from "@saas/core-platform";
import * as argon2 from "argon2";

@Injectable()
export class StaffService {
  constructor(private readonly staffRepo: StaffRepository) {}

  async createStaff(
    tenantId: string,
    schoolId: string,
    dto: CreateStaffDto,
  ) {
    const school = await kernel.db.school.findUnique({
      where: { id: schoolId },
    });
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException("School does not belong to the active workspace.");
    }

    // Validate campuses belong to school
    if (dto.campusIds && dto.campusIds.length > 0) {
      for (const cid of dto.campusIds) {
        const campus = await kernel.db.campus.findUnique({
          where: { id: cid },
        });
        if (!campus || campus.schoolId !== schoolId || campus.tenantId !== tenantId) {
          throw new BadRequestException(`Campus ${cid} does not belong to this school.`);
        }
      }
    }

    // Resolve or provision User
    let userId = dto.userId;
    if (!userId) {
      const email = dto.email ? dto.email.toLowerCase().trim() : null;
      if (email) {
        const existing = await kernel.db.user.findUnique({ where: { email } });
        if (existing) {
          userId = existing.id;
          const existingProfile = await kernel.db.staffProfile.findUnique({
            where: { userId },
          });
          if (existingProfile) {
            throw new ConflictException("A staff profile already exists for this email.");
          }
        } else {
          const dummyHash = await argon2.hash("TempPass123!");
          const newUser = await kernel.db.user.create({
            data: {
              email,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone || null,
              passwordHash: dummyHash,
            },
          });
          userId = newUser.id;
        }
      } else {
        const randomEmail = `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}@tenant.schoolos.internal`;
        const dummyHash = await argon2.hash("TempPass123!");
        const newUser = await kernel.db.user.create({
          data: {
            email: randomEmail,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone || null,
            passwordHash: dummyHash,
          },
        });
        userId = newUser.id;
      }
    }

    // Allocate atomic staff number
    const staffNumber = await this.staffRepo.mintStaffNumber(schoolId);

    return this.staffRepo.createStaff(tenantId, schoolId, {
      userId,
      staffNumber,
      designation: dto.designation,
      joinedAt: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      campusIds: dto.campusIds,
    });
  }

  async getStaff(tenantId: string, schoolId: string, staffId: string) {
    const staff = await this.staffRepo.findStaffInWorkspace(
      tenantId,
      schoolId,
      staffId,
    );
    if (!staff) {
      throw new NotFoundException("Staff profile not found.");
    }
    return staff;
  }

  async updateStaff(
    tenantId: string,
    schoolId: string,
    staffId: string,
    dto: UpdateStaffDto,
  ) {
    await this.getStaff(tenantId, schoolId, staffId);

    return this.staffRepo.updateStaff(tenantId, schoolId, staffId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      designation: dto.designation,
    });
  }

  async listStaff(
    tenantId: string,
    schoolId: string,
    campusId?: string,
    skip = 0,
    take = 50,
    search?: string,
  ) {
    return this.staffRepo.getStaffList(tenantId, schoolId, campusId, skip, take, search);
  }

  async updateStaffStatus(
    tenantId: string,
    schoolId: string,
    staffId: string,
    targetStatus: StaffStatus,
  ) {
    const staff = await this.getStaff(tenantId, schoolId, staffId);

    const terminalStates: StaffStatus[] = [
      StaffStatus.RESIGNED,
      StaffStatus.TERMINATED,
    ];

    if (terminalStates.includes(staff.status as StaffStatus)) {
      throw new ConflictException(
        "Terminal state cannot be reversed. Create a new employment record.",
      );
    }

    if (staff.status === targetStatus) {
      return staff;
    }

    return this.staffRepo.updateStaffStatus(
      tenantId,
      schoolId,
      staffId,
      targetStatus,
    );
  }
}
