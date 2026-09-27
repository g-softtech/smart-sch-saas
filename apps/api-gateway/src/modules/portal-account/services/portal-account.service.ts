import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Optional,
  Inject,
} from "@nestjs/common";
import { kernel, tenantContext } from "@saas/core-platform";
import { randomBytes, createHmac } from "crypto";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { NotificationsService } from "../../notifications/notifications.service";
import { validatePasswordPolicy } from "../../identity/utils/password-policy";
import {
  ProvisionStudentPortalDto,
  ProvisionGuardianPortalDto,
  ActivateAccountDto,
} from "../dto/portal-account.dto";

@Injectable()
export class PortalAccountService {
  private readonly logger = new Logger(PortalAccountService.name);
  private readonly SECRET_KEY =
    process.env.INVITATION_SECRET || "fallback-portal-invitation-secret-key-2026";

  constructor(
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  private hashToken(token: string): string {
    return createHmac("sha256", this.SECRET_KEY).update(token).digest("hex");
  }

  private maskName(name: string): string {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "";
    const [user, domain] = email.split("@");
    if (user.length <= 2) return `${user.charAt(0)}***@${domain}`;
    return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
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

    // 2. Prevent duplicate provisioning if student account is already activated
    let existingUserEmail: string | undefined;
    if (student.userId) {
      const existingUser = await kernel.db.user.findUnique({
        where: { id: student.userId },
      });
      if (existingUser && existingUser.passwordHash) {
        throw new BadRequestException("Student already has an active provisioned portal account");
      }
      if (existingUser) {
        existingUserEmail = existingUser.email;
      }
    }

    // 3. Resolve email address
    const email = (dto.email || existingUserEmail || student.email)?.toLowerCase()?.trim();
    if (!email) {
      throw new BadRequestException("Email address is required to provision student portal access");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.endsWith("@school.internal")) {
      throw new BadRequestException("A valid recipient email address is required");
    }

    // Save/sync Student email
    if (student.email !== email) {
      await kernel.db.student.update({
        where: { id: studentId },
        data: { email },
      });
    }

    // 4. Duplicate email / User resolution
    let user = await kernel.db.user.findUnique({
      where: { email },
    });

    if (user) {
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
          globalRole: "USER",
        },
      });
    }

    // 5. Link Student record to User
    await kernel.db.student.update({
      where: { id: studentId },
      data: { userId: user.id },
    });

    // 6. Ensure active tenant membership
    const membership = await kernel.db.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!membership) {
      const studentRole = await kernel.db.role.findFirst({
        where: { tenantId, name: "Student" },
      });

      const defaultRole = studentRole || (await kernel.db.role.findFirst({ where: { tenantId } }));
      if (!defaultRole) {
        throw new BadRequestException("No suitable role found for portal user");
      }

      await kernel.db.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          roleId: defaultRole.id,
          state: "PROVISIONED",
        },
      });
    }

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

    const activationUrl = `/activate?token=${rawToken}`;

    // Send transactional invitation email if notifications service is available
    let emailSent = false;
    let emailError: string | undefined;

    if (this.notificationsService) {
      try {
        const school = await kernel.db.school.findUnique({ where: { id: schoolId } });
        const schoolName = school?.name || "SchoolOS";
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; color: #F8FAFC; padding: 32px; borderRadius: 16px;">
            <h2 style="color: #F59E0B;">SchoolOS Student Portal Invitation</h2>
            <p>Hello ${student.firstName},</p>
            <p>You have been invited to activate your student portal account for <strong>${schoolName}</strong>.</p>
            <div style="margin: 32px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}${activationUrl}" style="background: #F59E0B; color: #0F172A; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Activate Student Account</a>
            </div>
            <p style="color: #94A3B8; font-size: 14px;">This activation link will expire in 72 hours.</p>
          </div>
        `;
        await this.notificationsService.sendTransactionalEmail(
          email,
          `Activate your Student Portal Account - ${schoolName}`,
          html
        );
        emailSent = true;
      } catch (emailErr: any) {
        this.logger.error(`Failed to dispatch student portal invitation email to ${email}`, emailErr);
        emailSent = false;
        emailError = "Portal account was prepared, but we could not send the invitation email. Please retry.";
      }
    }

    return {
      success: true,
      invitationId: invitation.id,
      studentId,
      userId: user.id,
      email,
      token: rawToken,
      activationUrl,
      expiresAt: invitation.expiresAt,
      emailSent,
      emailError: emailSent ? undefined : emailError,
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

    // 2. Prevent duplicate provisioning if guardian account is already activated
    let existingUserEmail: string | undefined;
    if (guardian.userId) {
      const existingUser = await kernel.db.user.findUnique({
        where: { id: guardian.userId },
      });
      if (existingUser && existingUser.passwordHash) {
        throw new BadRequestException("Guardian already has an active provisioned portal account");
      }
      if (existingUser) {
        existingUserEmail = existingUser.email;
      }
    }

    // 3. Resolve email address
    const email = (dto.email || existingUserEmail || guardian.email)?.toLowerCase()?.trim();
    if (!email) {
      throw new BadRequestException("Email address is required to provision guardian portal access");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.endsWith("@school.internal")) {
      throw new BadRequestException("A valid recipient email address is required");
    }

    // Save/sync Guardian email
    if (guardian.email !== email) {
      await kernel.db.guardian.update({
        where: { id: guardianId },
        data: { email },
      });
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
          globalRole: "USER",
        },
      });
    }

    // 5. Link Guardian record to User
    await kernel.db.guardian.update({
      where: { id: guardianId },
      data: { userId: user.id },
    });

    // 6. Ensure active tenant membership
    const membership = await kernel.db.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!membership) {
      const parentRole = await kernel.db.role.findFirst({
        where: { tenantId, name: "Parent" },
      });

      const defaultRole = parentRole || (await kernel.db.role.findFirst({ where: { tenantId } }));
      if (!defaultRole) {
        throw new BadRequestException("No suitable role found for portal user");
      }

      await kernel.db.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          roleId: defaultRole.id,
          state: "PROVISIONED",
        },
      });
    }

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

    const activationUrl = `/activate?token=${rawToken}`;

    // Send transactional invitation email if notifications service is available
    let emailSent = false;
    let emailError: string | undefined;

    if (this.notificationsService) {
      try {
        const school = await kernel.db.school.findUnique({ where: { id: schoolId } });
        const schoolName = school?.name || "SchoolOS";
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; color: #F8FAFC; padding: 32px; borderRadius: 16px;">
            <h2 style="color: #F59E0B;">SchoolOS Guardian Portal Invitation</h2>
            <p>Hello ${guardian.firstName},</p>
            <p>You have been invited to activate your Parent/Guardian portal account for <strong>${schoolName}</strong>.</p>
            <div style="margin: 32px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}${activationUrl}" style="background: #F59E0B; color: #0F172A; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Activate Guardian Account</a>
            </div>
            <p style="color: #94A3B8; font-size: 14px;">This activation link will expire in 72 hours.</p>
          </div>
        `;
        await this.notificationsService.sendTransactionalEmail(
          email,
          `Activate your Parent/Guardian Portal Account - ${schoolName}`,
          html
        );
        emailSent = true;
      } catch (emailErr: any) {
        this.logger.error(`Failed to dispatch guardian portal invitation email to ${email}`, emailErr);
        emailSent = false;
        emailError = "Portal account was prepared, but we could not send the invitation email. Please retry.";
      }
    }

    return {
      success: true,
      invitationId: invitation.id,
      guardianId,
      userId: user.id,
      email,
      token: rawToken,
      activationUrl,
      expiresAt: invitation.expiresAt,
      emailSent,
      emailError: emailSent ? undefined : emailError,
    };
  }

  async validateToken(token: string) {
    if (!token || typeof token !== "string") {
      throw new BadRequestException("Token is required.");
    }

    const tokenHash = this.hashToken(token.trim());
    const invitation = await kernel.db.portalInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      return { valid: false, status: "INVALID", message: "Invalid activation token." };
    }

    if (invitation.isConsumed) {
      return { valid: false, status: "CONSUMED", message: "Activation token has already been used." };
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return { valid: false, status: "EXPIRED", message: "Activation token has expired." };
    }

    let recipientName = "";
    let schoolName = "";
    let email = "";

    const user = await kernel.db.user.findUnique({ where: { id: invitation.userId } });
    if (user) email = user.email;

    await tenantContext.run({ tenantId: invitation.tenantId }, async () => {
      if (invitation.targetType === "STUDENT" && invitation.studentId) {
        const student = await kernel.db.student.findUnique({
          where: { id: invitation.studentId },
          include: { school: true },
        });
        if (student) {
          recipientName = `${student.firstName} ${student.lastName}`;
          schoolName = student.school?.name || "";
        }
      } else if (invitation.targetType === "GUARDIAN" && invitation.guardianId) {
        const guardian = await kernel.db.guardian.findUnique({
          where: { id: invitation.guardianId },
        });
        const school = await kernel.db.school.findUnique({
          where: { id: invitation.schoolId },
        });
        if (guardian) {
          recipientName = `${guardian.firstName} ${guardian.lastName}`;
        }
        if (school) {
          schoolName = school.name;
        }
      }
    });

    return {
      valid: true,
      status: "PENDING",
      targetType: invitation.targetType,
      recipientName: this.maskName(recipientName),
      schoolName: schoolName || "SchoolOS",
      maskedEmail: this.maskEmail(email),
      expiresAt: invitation.expiresAt,
    };
  }

  async resendInvitation(
    tenantId: string,
    schoolId: string,
    targetId: string,
    targetType: "STUDENT" | "GUARDIAN",
    createdById: string,
  ) {
    if (targetType === "STUDENT") {
      const student = await kernel.db.student.findUnique({ where: { id: targetId } });
      if (!student || student.tenantId !== tenantId) {
        throw new NotFoundException("Student not found in tenant");
      }
      return this.provisionStudentPortal(tenantId, schoolId, targetId, createdById, {});
    } else {
      const guardian = await kernel.db.guardian.findUnique({ where: { id: targetId } });
      if (!guardian || guardian.tenantId !== tenantId) {
        throw new NotFoundException("Guardian not found in tenant");
      }
      return this.provisionGuardianPortal(tenantId, schoolId, targetId, createdById, {});
    }
  }

  async revokeInvitation(
    tenantId: string,
    schoolId: string,
    targetId: string,
    targetType: "STUDENT" | "GUARDIAN",
  ) {
    if (targetType === "STUDENT") {
      await kernel.db.portalInvitation.deleteMany({
        where: { tenantId, studentId: targetId, isConsumed: false },
      });
    } else {
      await kernel.db.portalInvitation.deleteMany({
        where: { tenantId, guardianId: targetId, isConsumed: false },
      });
    }
    return { success: true, message: "Invitation revoked successfully." };
  }

  async getStudentInvitationStatus(tenantId: string, schoolId: string, studentId: string) {
    const student = await kernel.db.student.findUnique({ where: { id: studentId } });
    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException("Student not found in tenant");
    }

    if (student.userId) {
      const user = await kernel.db.user.findUnique({ where: { id: student.userId } });
      if (user && user.passwordHash) {
        return { isProvisioned: true, status: "ACTIVE", userId: user.id, email: user.email };
      }
    }

    const invitation = await kernel.db.portalInvitation.findFirst({
      where: { tenantId, studentId, isConsumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (invitation) {
      if (new Date() > new Date(invitation.expiresAt)) {
        return { isProvisioned: false, status: "EXPIRED", invitationId: invitation.id, expiresAt: invitation.expiresAt };
      }
      return {
        isProvisioned: true,
        status: "PENDING",
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    }

    return { isProvisioned: false, status: "NOT_PROVISIONED" };
  }

  async getGuardianInvitationStatus(tenantId: string, schoolId: string, guardianId: string) {
    const guardian = await kernel.db.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian || guardian.tenantId !== tenantId) {
      throw new NotFoundException("Guardian not found in tenant");
    }

    if (guardian.userId) {
      const user = await kernel.db.user.findUnique({ where: { id: guardian.userId } });
      if (user && user.passwordHash) {
        return { isProvisioned: true, status: "ACTIVE", userId: user.id, email: user.email };
      }
    }

    const invitation = await kernel.db.portalInvitation.findFirst({
      where: { tenantId, guardianId, isConsumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (invitation) {
      if (new Date() > new Date(invitation.expiresAt)) {
        return { isProvisioned: false, status: "EXPIRED", invitationId: invitation.id, expiresAt: invitation.expiresAt };
      }
      return {
        isProvisioned: true,
        status: "PENDING",
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    }

    return { isProvisioned: false, status: "NOT_PROVISIONED" };
  }

  async activateAccount(dto: ActivateAccountDto) {
    // 1. Centralized password policy check
    validatePasswordPolicy(dto.password);

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

    // 2. Update User & Membership atomically
    await kernel.db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: new Date(),
      },
    });

    await tenantContext.run({ tenantId: invitation.tenantId }, async () => {
      await kernel.db.userTenantMembership.updateMany({
        where: { userId: user.id, tenantId: invitation.tenantId },
        data: {
          state: "ACTIVE",
        },
      });
    });

    // 3. Mark invitation as consumed atomically to prevent race conditions
    const updateResult = await kernel.db.portalInvitation.updateMany({
      where: { id: invitation.id, isConsumed: false },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException("Activation token has already been used");
    }

    // 4. Issue access token if JwtService is available
    let accessToken: string | undefined;
    if (this.jwtService) {
      accessToken = await this.jwtService.signAsync({ sub: user.id });
    }

    const redirectUrl =
      invitation.targetType === "STUDENT"
        ? "/portal/student/dashboard"
        : "/portal/parent/dashboard";

    return {
      success: true,
      message: "Account activated successfully.",
      userId: user.id,
      email: user.email,
      accessToken,
      redirectUrl,
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
