import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { TenantMembershipRepository } from "../repositories/tenant-membership.repository";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";

export interface LoginDto {
  email: string;
  password?: string;
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: TenantMembershipRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash || !dto.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Access-Token-Only contract with stateless JWT
    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async getWorkspaces(userId: string) {
    const { kernel, tenantContext } = require("@saas/core-platform");

    // Find active memberships across all tenants using the system bypass query
    const activeMemberships =
      await this.membershipRepository.findActiveByUserId(userId);
    const result = [];

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

        const isSuperAdmin = userMembership.role?.name === "SUPER_ADMIN";
        let schoolsData = [];

        if (isSuperAdmin) {
          // SUPER_ADMIN gets all schools and campuses
          const schools = await kernel.db.school.findMany({
            include: { campuses: true },
            orderBy: { name: "asc" },
          });

          schoolsData = schools.map((s) => ({
            id: s.id,
            name: s.name,
            accessLevel: "FULL_SCHOOL",
            campuses: s.campuses.map((c) => ({ id: c.id, name: c.name })),
          }));
        } else {
          // USER gets explicitly assigned schools/campuses
          const accesses = await kernel.db.userSchoolAccess.findMany({
            where: { userId },
            include: {
              school: {
                include: { campuses: true },
              },
            },
          });

          // Group by school
          const schoolsMap = new Map();
          for (const access of accesses) {
            if (!schoolsMap.has(access.schoolId)) {
              schoolsMap.set(access.schoolId, {
                id: access.school.id,
                name: access.school.name,
                campuses: [],
                accessLevel: "CAMPUS_RESTRICTED", // assume restricted until we see a null campusId
                allowedCampusIds: new Set(),
              });
            }
            const schoolData = schoolsMap.get(access.schoolId);
            if (access.campusId === null) {
              schoolData.accessLevel = "FULL_SCHOOL";
            } else {
              schoolData.allowedCampusIds.add(access.campusId);
            }
          }

          schoolsData = Array.from(schoolsMap.values()).map((schoolData) => {
            // If full school, return all campuses. If restricted, return only allowed ones.
            const accessLevel = schoolData.accessLevel;
            const allowedCampuses =
              accessLevel === "FULL_SCHOOL"
                ? () => true
                : (c) => schoolData.allowedCampusIds.has(c.id);

            const access = accesses.find((a) => a.schoolId === schoolData.id);
            const visibleCampuses = access.school.campuses
              .filter(allowedCampuses)
              .map((c) => ({ id: c.id, name: c.name }));

            return {
              id: schoolData.id,
              name: schoolData.name,
              accessLevel,
              campuses: visibleCampuses,
            };
          });
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
}
