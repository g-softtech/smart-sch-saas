import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { TenantMembershipRepository } from "../repositories/tenant-membership.repository";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, createHmac } from "crypto";
import { NotificationsService } from "../../notifications/notifications.service";
import { validatePasswordPolicy } from "../utils/password-policy";
import { ForgotPasswordDto, ResetPasswordDto } from "../dto/auth.dto";

export interface LoginDto {
  email: string;
  password?: string;
}

@Injectable()
export class AuthenticationService {
  private readonly RESET_SECRET =
    process.env.RESET_SECRET || "fallback-password-reset-secret-key-2026";

  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: TenantMembershipRepository,
    private readonly jwtService: JwtService,
    @Optional() private readonly notificationsService?: NotificationsService
  ) {}

  private hashResetToken(token: string): string {
    return createHmac("sha256", this.RESET_SECRET).update(token).digest("hex");
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    if (!dto.email) throw new UnauthorizedException("Invalid credentials");
    const user = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (!user || !user.passwordHash || !dto.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const genericSuccess = {
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
    };

    if (!dto.email) return genericSuccess;

    const { kernel } = require("@saas/core-platform");
    const user = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (!user) {
      return genericSuccess;
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 Hour

    await kernel.db.passwordResetToken.deleteMany({
      where: { userId: user.id, isConsumed: false },
    });

    await kernel.db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        isConsumed: false,
      },
    });

    const resetUrl = `/reset-password?token=${rawToken}`;

    if (this.notificationsService) {
      try {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 16px;">
            <h2 style="color: #F59E0B;">SchoolOS Password Reset Request</h2>
            <p>You recently requested to reset your password for your SchoolOS account.</p>
            <div style="margin: 32px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}${resetUrl}" style="background: #F59E0B; color: #0F172A; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #94A3B8; font-size: 14px;">This reset link is valid for 1 hour. If you did not request this, please ignore this email.</p>
          </div>
        `;
        await this.notificationsService.sendTransactionalEmail(
          user.email,
          "Reset your SchoolOS Password",
          html
        );
      } catch (err) {
        // Log & proceed safely
      }
    }

    return genericSuccess;
  }

  async validateResetToken(token: string) {
    if (!token || typeof token !== "string") {
      return { valid: false, message: "Reset token is required." };
    }

    const { kernel } = require("@saas/core-platform");
    const tokenHash = this.hashResetToken(token.trim());
    const resetToken = await kernel.db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken) {
      return { valid: false, message: "Invalid password reset token." };
    }

    if (resetToken.isConsumed) {
      return { valid: false, message: "Password reset token has already been used." };
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      return { valid: false, message: "Password reset token has expired." };
    }

    return { valid: true, message: "Token is valid." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    validatePasswordPolicy(dto.newPassword);

    const { kernel } = require("@saas/core-platform");
    const tokenHash = this.hashResetToken(dto.token.trim());
    const resetToken = await kernel.db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.isConsumed) {
      throw new BadRequestException("Invalid or consumed password reset token");
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      throw new BadRequestException("Password reset token has expired");
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await kernel.db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    const updateResult = await kernel.db.passwordResetToken.updateMany({
      where: { id: resetToken.id, isConsumed: false },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException("Password reset token has already been used");
    }

    return {
      success: true,
      message: "Password has been successfully reset. You may now log in.",
    };
  }

  async getWorkspaces(userId: string) {
    const activeMemberships =
      await this.membershipRepository.findActiveByUserId(userId);
    const result = [];

    const { kernel, tenantContext } = require("@saas/core-platform");

    for (const active of activeMemberships) {
      await tenantContext.run({ tenantId: active.tenantId }, async () => {
        const userMembership = await kernel.db.userTenantMembership.findUnique({
          where: { userId_tenantId: { userId, tenantId: active.tenantId } },
          include: { role: true },
        });

        if (
          !userMembership ||
          userMembership.isRevoked ||
          userMembership.state !== "ACTIVE"
        ) {
          return;
        }

        const schoolsData = [];
        for (const school of active.schools) {
          const hasFullSchoolAccess =
            await kernel.db.userSchoolAccess.findFirst({
              where: {
                userId,
                tenantId: active.tenantId,
                schoolId: school.id,
                campusId: null,
              },
            });

          let accessLevel: "FULL_SCHOOL" | "CAMPUS_RESTRICTED" = "CAMPUS_RESTRICTED";
          let campuses = [];

          if (hasFullSchoolAccess) {
            accessLevel = "FULL_SCHOOL";
            campuses = await kernel.db.campus.findMany({
              where: { tenantId: active.tenantId, schoolId: school.id },
              select: { id: true, name: true },
            });
          } else {
            const campusAccessRecords =
              await kernel.db.userSchoolAccess.findMany({
                where: {
                  userId,
                  tenantId: active.tenantId,
                  schoolId: school.id,
                  campusId: { not: null },
                },
                include: { campus: true },
              });

            campuses = campusAccessRecords.map((car) => ({
              id: car.campus.id,
              name: car.campus.name,
            }));
          }

          if (accessLevel === "FULL_SCHOOL" || campuses.length > 0) {
            schoolsData.push({
              id: school.id,
              name: school.name,
              accessLevel,
              campuses,
            });
          }
        }

        result.push({
          tenantId: active.tenantId,
          tenantName: active.tenantName,
          schools: schoolsData,
        });
      });
    }

    return result;
  }

  async getIdentityContext(userId: string) {
    const { kernel } = require("@saas/core-platform");
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // 1. System-level cross-tenant Student identity query
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

    // 2. System-level cross-tenant Guardian identity query
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

      // Query authorized linked children for this guardian
      const children = await kernel.$queryRaw<
        Array<{ id: string; firstName: string; lastName: string; schoolId: string; schoolName: string }>
      >`
        SELECT s.id, s."firstName", s."lastName", s."schoolId", sch.name AS "schoolName"
        FROM stud_student_guardians sg
        INNER JOIN stud_students s ON s.id = sg."studentId"
        LEFT JOIN "School" sch ON sch.id = s."schoolId"
        WHERE sg."guardianId" = ${guardian.id}
          AND s."tenantId" = ${guardian.tenantId}
      `;

      return {
        userId: user.id,
        email: user.email,
        portalType: "PARENT",
        guardianId: guardian.id,
        tenantId: guardian.tenantId,
        children: children || [],
        redirectUrl: "/portal/parent/dashboard",
      };
    }

    // 3. Default to Staff/Admin
    return {
      userId: user.id,
      email: user.email,
      portalType: "STAFF",
      redirectUrl: "/workspaces",
    };
  }
}
