import { Injectable } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { User, Prisma } from '@saas/core-platform';

@Injectable()
export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return kernel.db.user.findUnique({
      where: { email }
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return kernel.db.user.create({
      data
    });
  }

  async transaction<T>(callback: (repo: UserRepository) => Promise<T>): Promise<T> {
    // For this minimal adaptation, we simulate a transaction wrapper if needed, 
    // or just execute directly since we are delegating to kernel.db.
    // Full nested transactions require Prisma $transaction which is handled inside the kernel context.
    return callback(this);
  }
}
