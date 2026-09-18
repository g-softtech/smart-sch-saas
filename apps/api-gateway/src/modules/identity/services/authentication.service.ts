import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { TenantMembershipRepository } from '../repositories/tenant-membership.repository';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

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
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Access-Token-Only contract with stateless JWT
    const payload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async getWorkspaces(userId: string) {
    const { kernel } = require('@saas/core-platform');

    // Find active memberships and their roles
    const memberships = await kernel.db.userTenantMembership.findMany({
      where: {
        userId,
        state: 'ACTIVE',
        isRevoked: false,
      },
      include: {
        tenant: true,
        role: true,
      }
    });

    const result = [];

    for (const membership of memberships) {
      const isSuperAdmin = membership.role?.name === 'SUPER_ADMIN';
      const tenantId = membership.tenantId;

      let schoolsData = [];

      if (isSuperAdmin) {
        // SUPER_ADMIN gets all schools and campuses
        const schools = await kernel.db.school.findMany({
          where: { tenantId },
          include: { campuses: true },
          orderBy: { name: 'asc' }
        });

        schoolsData = schools.map(s => ({
          id: s.id,
          name: s.name,
          accessLevel: 'FULL_SCHOOL',
          campuses: s.campuses.map(c => ({ id: c.id, name: c.name }))
        }));
      } else {
        // USER gets explicitly assigned schools/campuses
        const accesses = await kernel.db.userSchoolAccess.findMany({
          where: { userId, tenantId },
          include: {
            school: {
              include: { campuses: true }
            }
          }
        });

        // Group by school
        const schoolsMap = new Map();
        for (const access of accesses) {
          if (!schoolsMap.has(access.schoolId)) {
            schoolsMap.set(access.schoolId, {
              id: access.school.id,
              name: access.school.name,
              campuses: [],
              accessLevel: 'CAMPUS_RESTRICTED', // assume restricted until we see a null campusId
              allowedCampusIds: new Set()
            });
          }
          const schoolData = schoolsMap.get(access.schoolId);
          if (access.campusId === null) {
            schoolData.accessLevel = 'FULL_SCHOOL';
          } else {
            schoolData.allowedCampusIds.add(access.campusId);
          }
        }

        schoolsData = Array.from(schoolsMap.values()).map(schoolData => {
          // If full school, return all campuses. If restricted, return only allowed ones.
          const accessLevel = schoolData.accessLevel;
          const allowedCampuses = accessLevel === 'FULL_SCHOOL'
            ? accessData => true
            : c => schoolData.allowedCampusIds.has(c.id);

          const access = accesses.find(a => a.schoolId === schoolData.id);
          const visibleCampuses = access.school.campuses
            .filter(allowedCampuses)
            .map(c => ({ id: c.id, name: c.name }));

          return {
            id: schoolData.id,
            name: schoolData.name,
            accessLevel,
            campuses: visibleCampuses
          };
        });
      }

      result.push({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        schools: schoolsData
      });
    }

    return result;
  }
}
