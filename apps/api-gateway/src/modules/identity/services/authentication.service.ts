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
    const memberships = await this.membershipRepository.findActiveByUserId(userId);
    return memberships.map(m => ({
      tenantId: m.tenantId,
      tenantName: m.tenantName,
      schools: m.schools.map(s => ({
        schoolId: s.id,
        schoolName: s.name,
      })),
    }));
  }
}
