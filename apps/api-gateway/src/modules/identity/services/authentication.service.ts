import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { TenantMembershipRepository } from "../repositories/tenant-membership.repository";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { kernel, GlobalRole, MembershipStatus, TenantStatus } from "@saas/core-platform";
import { ForgotPasswordDto, ResetPasswordDto } from "../dto/auth.dto";

export interface LoginDto {
  email: string;
  password?: string;
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: TenantMembershipRepository,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.userRepository.findByEmail(dto.email.toLowerCase().trim());
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Server-side account active and suspension check
    if (!user.isActive || user.isSuspended) {
      throw new UnauthorizedException("Account is deactivated or suspended");
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate JWT payload with sub: user.id
    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async getIdentityContext(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.isActive || user.isSuspended) {
      throw new UnauthorizedException("Account is deactivated or suspended");
    }

    // 1. Check Platform Super Admin / Business Login
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return {
        userId: user.id,
        email: user.email,
        globalRole: GlobalRole.SUPER_ADMIN,
        portalType: "SUPER_ADMIN",
        redirectUrl: "/super-admin",
      };
    }

    // 2. Check Student profile
    const student = await kernel.rawDb.student.findFirst({
      where: { userId },
      include: {
        school: {
          include: { tenant: true },
        },
      },
    });

    if (student) {
      if (student.school.tenant.status === TenantStatus.SUSPENDED) {
        throw new ForbiddenException("Tenant organization is suspended");
      }
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

    // 3. Check Guardian / Parent profile
    const guardian = await kernel.rawDb.guardian.findFirst({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: { school: true },
            },
          },
        },
      },
    });

    if (guardian) {
      const tenant = await kernel.rawDb.tenant.findUnique({
        where: { id: guardian.tenantId },
      });
      if (tenant?.status === TenantStatus.SUSPENDED) {
        throw new ForbiddenException("Tenant organization is suspended");
      }

      const children = guardian.students.map((sg) => ({
        id: sg.student.id,
        firstName: sg.student.firstName,
        lastName: sg.student.lastName,
        schoolId: sg.student.schoolId,
        schoolName: sg.student.school.name,
      }));

      return {
        userId: user.id,
        email: user.email,
        portalType: "PARENT",
        guardianId: guardian.id,
        tenantId: guardian.tenantId,
        children,
        redirectUrl: "/portal/parent/dashboard",
      };
    }

    // 4. Check Staff / Teacher profile
    const staff = await kernel.rawDb.staffProfile.findFirst({
      where: { userId },
      include: {
        school: {
          include: { tenant: true },
        },
        subjectAssignments: true,
      },
    });

    if (staff) {
      if (staff.school.tenant.status === TenantStatus.SUSPENDED) {
        throw new ForbiddenException("Tenant organization is suspended");
      }

      const isTeacher = staff.subjectAssignments.length > 0;
      return {
        userId: user.id,
        email: user.email,
        portalType: isTeacher ? "TEACHER" : "STAFF",
        staffId: staff.id,
        staffNumber: staff.staffNumber,
        schoolId: staff.schoolId,
        tenantId: staff.tenantId,
        redirectUrl: isTeacher ? "/portal/teacher/dashboard" : "/workspaces",
      };
    }

    // 5. Default Tenant Staff / School User
    const membership = await kernel.rawDb.tenantMembership.findFirst({
      where: { userId, status: MembershipStatus.ACTIVE },
      include: { tenant: true },
    });

    if (membership && membership.tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException("Tenant organization is suspended");
    }

    return {
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
      portalType: "STAFF",
      redirectUrl: "/workspaces",
    };
  }

  async getWorkspaces(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException("User not found");
    if (!user.isActive || user.isSuspended) throw new UnauthorizedException("Account suspended");

    // Discover active tenant memberships
    const memberships = await kernel.rawDb.tenantMembership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        tenant: {
          status: TenantStatus.ACTIVE,
        },
      },
      include: {
        tenant: {
          include: {
            schools: {
              where: { status: 'ACTIVE' },
              include: {
                campuses: {
                  where: { status: 'ACTIVE' },
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      tenantId: m.tenant.id,
      tenantName: m.tenant.name,
      role: "STAFF",
      schools: m.tenant.schools.map((s) => ({
        id: s.id,
        name: s.name,
        accessLevel: "FULL_SCHOOL",
        campuses: s.campuses,
      })),
    }));
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    return {
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent.",
    };
  }

  async validateResetToken(token: string) {
    return { valid: false, message: "Token service ready" };
  }

  async resetPassword(dto: ResetPasswordDto) {
    return { success: true, message: "Password reset ready" };
  }
}
