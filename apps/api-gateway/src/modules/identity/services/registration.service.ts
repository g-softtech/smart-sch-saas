import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

export interface RegisterDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any, accessToken: string }> {
    return this.userRepository.transaction(async (repo) => {
      const existing = await repo.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('User already exists');
      }

      let passwordHash = undefined;
      if (dto.password) {
         passwordHash = await argon2.hash(dto.password);
      }

      const user = await repo.create({
        email: dto.email,
        passwordHash,
        globalRole: 'USER'
      });

      // Access-Token-Only contract with stateless JWT
      const payload = { sub: user.id };
      const accessToken = await this.jwtService.signAsync(payload);

      return { user, accessToken };
    });
  }
}
