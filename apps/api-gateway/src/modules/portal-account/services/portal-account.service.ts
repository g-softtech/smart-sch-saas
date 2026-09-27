import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { kernel, tenantContext } from "@saas/core-platform";
import { randomBytes, createHmac } from "crypto";
import * as argon2 from "argon2";
import {
  ProvisionStudentPortalDto,
  ProvisionGuardianPortalDto,
  ActivateAccountDto,
} from "../dto/portal-account.dto";

@Injectable()
export class PortalAccountService {
  private readonly SECRET_KEY =
    process.env.INVITATION_SECRET || "fallback-portal-invitation-secret-key-2026";

  private hashToken(token: string): string {
    return createHmac("sha256", this.SECRET_KEY).update(token).digest("hex");
  }

  async provisionStudentPortal(
    tenantId: string,
    schoolId: string,
    studentId: string,
    createdById: string,
    dto: ProvisionStudentPortalDto
  ) {
    // 1. Authoritative student check within tenant & school
    const student = await kernel.db.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException("Student not found in active tenant");
    }

    if (student.schoolId !== schoolId) {
      throw new ForbiddenException("Student does not belong to active school");
    }

    // 2. Prevent duplicate provisioning if student.userId is set
    if (student.userId) {
      const existingUser = await kernel.db.user.findUnique({
        where: { id: student.userId },
      });
      if (existingUser) {
        throw new BadRequestException("Student already has a provisioned portal account");
      }
    }

    // 3. Resolve email address
    const studentCode = (student.studentNumber || student.id).toLowerCase();
    const email = (dto.email || `stu.${studentCode}@school.internal`).toLowerCase();

    // 4. Duplicate email / User resolution
    let user = await kernel.db.user.findUnique({
      where: { email },
    });

    if (user) {
      // Check if user is already linked to ANOTHER Student
      const otherStudent = await kernel.db.student.findFirst({
        where: { userId: user.id, id: { not: studentId } },
      });
      if (otherStudent) {
        throw new BadRequestException("User account with this email is already linked to another student");
      }
    } else {
      user = await kernel.db.user.create({
        data: {
          email,
          passwordHash: null,
          globalRole: "USER",
        },
      });
    }

    // 5. Authoritatively set Student.userId
    await kernel.db.student.update({
      where: { id: studentId },
      data: { userId: user.id },
    });

    // 6. Ensure system STUDENT role and UserTenantMembership
    let studentRole = await kernel.db.role.findFirst({
      where: { tenantId, name: "STUDENT" },
    });

    if (!studentRole) {
      studentRole = await kernel.db.role.create({
        data: {
          tenantId,
          name: "STUDENT",
          isSystem: true,
        },
      });
    }

    await kernel.db.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      create: {
        tenantId,
        userId: user.id,
        roleId: studentRole.id,
        state: "PENDING_ACTIVATION",
      },
      update: {
        roleId: studentRole.id,
        isRevoked: false,
      },
    });

    // 7. Generate single-use expiring activation token (72 hour validity)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

    // Invalidate any unconsumed invitations for this student
    await kernel.db.portalInvitation.deleteMany({
      where: { tenantId, studentId, isConsumed: false },
    });

    const invitation = await kernel.db.portalInvitation.create({
      data: {
        tenantId,
        schoolId,
        userId: user.id,
        tokenHash,
        targetType: "STUDENT",
        studentId,
        expiresAt,
        isConsumed: false,
        createdById,
      },
    });

    return {
      success: true,
      studentId,
      userId: user.id,
      email,
      token: rawToken,
      activationUrl: `/activate?token=${rawToken}`,
      expiresAt: invitation.expiresAt,
    };
  }

  async provisionGuardianPortal(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    createdById: string,
    dto: ProvisionGuardianPortalDto
  ) {
    // 1. Authoritative guardian check within tenant
    const guardian = await kernel.db.guardian.findUnique({
      where: { id: guardianId },
    });

    if (!guardian || guardian.tenantId !== tenantId) {
      throw new NotFoundException("Guardian not found in active tenant");
    }

    // 2. Prevent duplicate provisioning if guardian.userId is set
    if (guardian.userId) {
      const existingUser = await kernel.db.user.findUnique({
        where: { id: guardian.userId },
      });
      if (existingUser) {
        throw new BadRequestException("Guardian already has a provisioned portal account");
      }
    }

    // 3. Resolve email address
    const email = (dto.email || guardian.email)?.toLowerCase();
    if (!email) {
      throw new BadRequestException("Email address is required to provision guardian portal access");
    }

    // 4. Duplicate email / User resolution
    let user = await kernel.db.user.findUnique({
      where: { email },
    });

    if (user) {
      const otherGuardian = await kernel.db.guardian.findFirst({
        where: { userId: user.id, id: { not: guardianId } },
      });
      if (otherGuardian) {
        throw new BadRequestException("User account with this email is already linked to another guardian");
      }
    } else {
      user = await kernel.db.user.create({
        data: {
          email,
          passwordHash: null,
          globalRole: "USER",
        },
      });
    }

    // 5. Authoritatively set Guardian.userId
    await kernel.db.guardian.update({
      where: { id: guardianId },
      data: { userId: user.id },
    });

    // 6. Ensure system PARENT role and UserTenantMembership
    let parentRole = await kernel.db.role.findFirst({
      where: { tenantId, name: "PARENT" },
    });

    if (!parentRole) {
      parentRole = await kernel.db.role.create({
        data: {
          tenantId,
          name: "PARENT",
          isSystem: true,
        },
      });
    }

    await kernel.db.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      create: {
        tenantId,
        userId: user.id,
        roleId: parentRole.id,
        state: "PENDING_ACTIVATION",
      },
      update: {
        roleId: parentRole.id,
        isRevoked: false,
      },
    });

    // 7. Generate single-use expiring activation token (72 hour validity)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

    // Invalidate any unconsumed invitations for this guardian
    await kernel.db.portalInvitation.deleteMany({
      where: { tenantId, guardianId, isConsumed: false },
    });

    const invitation = await kernel.db.portalInvitation.create({
      data: {
        tenantId,
        schoolId,
        userId: user.id,
        tokenHash,
        targetType: "GUARDIAN",
        guardianId,
        expiresAt,
        isConsumed: false,
        createdById,
      },
    });

    return {
      success: true,
      guardianId,
      userId: user.id,
      email,
      token: rawToken,
      activationUrl: `/activate?token=${rawToken}`,
      expiresAt: invitation.expiresAt,
    };
  }

  async activateAccount(dto: ActivateAccountDto) {
    const tokenHash = this.hashToken(dto.token);
    const invitation = await kernel.db.portalInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new BadRequestException("Invalid activation token");
    }

    if (invitation.isConsumed) {
      throw new BadRequestException("Activation token has already been used");
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      throw new BadRequestException("Activation token has expired");
    }

    const user = await kernel.db.user.findUnique({
      where: { id: invitation.userId },
    });

    if (!user) {
      throw new NotFoundException("Target user account not found");
    }

    const passwordHash = await argon2.hash(dto.password);

    // Update User & Membership
    await kernel.db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: new Date(),
      },
    });

    await kernel.db.userTenantMembership.updateMany({
      where: { userId: user.id, tenantId: invitation.tenantId },
      data: {
        state: "ACTIVE",
      },
    });

    // Mark invitation as consumed
    await kernel.db.portalInvitation.update({
      where: { id: invitation.id },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Account activated successfully. You may now log in.",
      userId: user.id,
      email: user.email,
    };
  }

  async getIdentityContext(userId: string) {
    const user = await kernel.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // 1. Authoritative Student resolution (cross-tenant system lookup)
    const students = await kernel.$queryRaw<
      Array<{ id: string; schoolId: string; tenantId: string }>
    >`
      SELECT id, "schoolId", "tenantId"
      FROM stud_students
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    if (students && students.length > 0) {
      const student = students[0];
      return {
        userId: user.id,
        email: user.email,
        portalType: "STUDENT",
        studentId: student.id,
        schoolId: student.schoolId,
        tenantId: student.tenantId,
        redirectUrl: "/portal/student/dashboard",
      };
    }

    // 2. Authoritative Guardian resolution (cross-tenant system lookup)
    const guardians = await kernel.$queryRaw<
      Array<{ id: string; tenantId: string }>
    >`
      SELECT id, "tenantId"
      FROM stud_guardians
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    if (guardians && guardians.length > 0) {
      const guardian = guardians[0];
      return {
        userId: user.id,
        email: user.email,
        portalType: "PARENT",
        guardianId: guardian.id,
        tenantId: guardian.tenantId,
        redirectUrl: "/portal/parent/dashboard",
      };
    }

    // 3. Fallback to Staff / Admin
    return {
      userId: user.id,
      email: user.email,
      portalType: "STAFF",
      redirectUrl: "/workspaces",
    };
  }
}
