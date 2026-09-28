import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { StaffRepository } from "../repositories/staff.repository";
import { CreateStaffDto } from "../dto/create-staff.dto";
import { UpdateStaffDto } from "../dto/update-staff.dto";
import { StaffStatus, StaffProfile } from "@saas/core-platform";
import { kernel, tenantContext } from "@saas/core-platform";
import * as crypto from "crypto";
import { IssueCredentialDto } from "../dto/issue-credential.dto";

@Injectable()
export class StaffService {
  constructor(private readonly staffRepo: StaffRepository) {}

  async createStaff(
    tenantId: string,
    schoolId: string,
    dto: CreateStaffDto,
  ): Promise<StaffProfile> {
    // 1. Department Validation against authoritative tenant/school
    if (dto.departmentId) {
      const department = await kernel.db.department.findFirst({
        where: { id: dto.departmentId, tenantId, schoolId },
      });
      if (!department) {
        throw new BadRequestException(
          "Department does not exist in this workspace.",
        );
      }
    }

    // 2. User Workspace Validation (Prevent cross-tenant user linking)
    if (dto.userId) {
      const membership = await kernel.db.userTenantMembership.findFirst({
        where: { userId: dto.userId, tenantId },
      });
      if (!membership) {
        throw new BadRequestException(
          "User does not belong to this workspace.",
        );
      }
    }

    try {
      return await this.staffRepo.createStaffWithAtomicNumber(
        tenantId,
        schoolId,
        {
          ...dto,
          joiningDate: new Date(dto.joiningDate),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "A user cannot have multiple active/suspended staff profiles in the same school.",
        );
      }
      throw error;
    }
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
  ): Promise<StaffProfile> {
    const existing = await this.getStaff(tenantId, schoolId, staffId);

    // Sync email to User if staff is provisioned and email changed
    if (dto.email && existing.userId && dto.email !== existing.email) {
      const emailLower = dto.email.toLowerCase().trim();
      const existingUserWithEmail = await kernel.db.user.findUnique({
        where: { email: emailLower },
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== existing.userId) {
        throw new ConflictException("Another user already exists with this email address.");
      }
      await kernel.db.user.update({
        where: { id: existing.userId },
        data: { email: emailLower },
      });
    }

    return this.staffRepo.updateStaff(tenantId, schoolId, staffId, {
      ...dto,
      email: dto.email ? dto.email.toLowerCase().trim() : undefined,
    });
  }

  async listStaff(tenantId: string, schoolId: string, campusId?: string, skip = 0, take = 50, search?: string) {
    return this.staffRepo.getStaffList(tenantId, schoolId, campusId, skip, take, search);
  }

  async updateStaffStatus(
    tenantId: string,
    schoolId: string,
    staffId: string,
    targetStatus: StaffStatus,
  ) {
    const staff = await this.getStaff(tenantId, schoolId, staffId);

    // State machine logic
    const terminalStates: StaffStatus[] = [
      StaffStatus.RESIGNED,
      StaffStatus.RETIRED,
      StaffStatus.TERMINATED,
    ];

    if (terminalStates.includes(staff.status)) {
      throw new ConflictException(
        "Terminal state cannot be reversed. Create a new employment record.",
      );
    }

    if (
      (staff.status === StaffStatus.ACTIVE &&
        targetStatus === StaffStatus.ACTIVE) ||
      (staff.status === StaffStatus.SUSPENDED &&
        targetStatus === StaffStatus.SUSPENDED)
    ) {
      return staff; // No-op
    }

    return this.staffRepo.updateStaffStatus(
      tenantId,
      schoolId,
      staffId,
      targetStatus,
    );
  }

  // ─── Staff Photo Avatar Management ────────────────────────────────────────

  async uploadStaffPhoto(staffId: string, file: Express.Multer.File, schoolId: string) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException("Tenant context required");
    }

    const staff = await this.staffRepo.findStaffInWorkspace(tenantId, schoolId, staffId);
    if (!staff) {
      throw new NotFoundException("Staff profile not found in active workspace");
    }

    // Dynamic import file-type to validate actual magic numbers
    const fileType = await import("file-type");
    const type = await (fileType.default || (fileType as any)).fromBuffer(file.buffer);
    if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime)) {
      throw new BadRequestException("Invalid or unsupported file type. Must be JPEG, PNG, or WebP.");
    }

    // Upsert the photo
    const photo = await kernel.db.staffPhoto.upsert({
      where: { staffId },
      create: {
        tenantId,
        schoolId,
        staffId,
        mimeType: type.mime,
        data: file.buffer,
      },
      update: {
        mimeType: type.mime,
        data: file.buffer,
      },
    });

    return { id: photo.id, mimeType: photo.mimeType, updatedAt: photo.updatedAt };
  }

  async getStaffPhoto(staffId: string) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;

    let photo: any = null;

    if (tenantId) {
      // Scoped workspace fetch
      photo = await kernel.db.staffPhoto.findFirst({
        where: { staffId, tenantId },
      });
    } else {
      // Cross-tenant fallback for owner self-service: find unique staff photo
      photo = await kernel.db.staffPhoto.findUnique({
        where: { staffId },
      });
    }

    if (!photo) {
      return null;
    }

    return photo;
  }

  async deleteStaffPhoto(staffId: string, schoolId: string) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException("Tenant context required");
    }

    const staff = await this.staffRepo.findStaffInWorkspace(tenantId, schoolId, staffId);
    if (!staff) {
      throw new ForbiddenException("Not authorized to modify this staff profile");
    }

    await kernel.db.staffPhoto.delete({
      where: { staffId },
    }).catch(() => null);
  }

  async issueCredential(
    tenantId: string,
    schoolId: string,
    staffId: string,
    dto: IssueCredentialDto,
  ) {
    // We execute this in a transaction to safely revoke old and issue new
    return kernel.db.$transaction(async (tx) => {
      // 1. Explicitly fetch and validate StaffProfile inside the transaction
      const staff = await tx.staffProfile.findUnique({
        where: { id: staffId },
      });

      if (
        !staff ||
        staff.tenantId !== tenantId ||
        staff.schoolId !== schoolId
      ) {
        throw new NotFoundException("Staff not found in this workspace.");
      }

      // 2. Revoke active credentials
      await this.staffRepo.revokeActiveCredentials(tx, staffId, tenantId);

      // 3. Generate raw token and HMAC digest
      const rawToken = crypto.randomBytes(32).toString("hex");
      const secret = process.env.CREDENTIAL_SECRET;
      if (!secret) throw new Error("CREDENTIAL_SECRET is not configured");
      const credentialHash = crypto
        .createHmac("sha256", secret)
        .update(rawToken)
        .digest("hex");

      // 4. Save credential
      await this.staffRepo.saveCredential(tx, {
        tenantId,
        schoolId,
        staffId,
        credentialType: dto.type,
        credentialHash,
      });

      // 5. Return the raw token EXACTLY ONCE
      return {
        staffId,
        credentialType: dto.type,
        rawToken, // The client must save this. It will never be returned again.
      };
    });
  }

  async verifyCredential(tenantId: string, schoolId: string, rawToken: string) {
    const secret = process.env.CREDENTIAL_SECRET;
    if (!secret) {
      throw new Error("CREDENTIAL_SECRET is not configured");
    }

    const credentialHash = crypto
      .createHmac("sha256", secret)
      .update(rawToken)
      .digest("hex");

    const credential = await kernel.db.staffCredential.findUnique({
      where: {
        tenantId_credentialHash: {
          tenantId,
          credentialHash,
        },
      },
      include: {
        staff: true,
      },
    });

    if (!credential) {
      throw new NotFoundException("Invalid credential");
    }

    if (credential.schoolId !== schoolId) {
      throw new NotFoundException("Invalid credential");
    }

    if (!credential.isActive) {
      throw new BadRequestException("Credential is inactive or revoked");
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new BadRequestException("Credential has expired");
    }

    if (
      credential.staff.status !== StaffStatus.ACTIVE &&
      credential.staff.status !== StaffStatus.SUSPENDED
    ) {
      throw new BadRequestException("Staff profile is not active");
    }

    return {
      valid: true,
      staffId: credential.staffId,
      staffNumber: credential.staff.staffNumber,
      credentialType: credential.credentialType,
    };
  }
}
