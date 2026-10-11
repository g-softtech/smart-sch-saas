import { Injectable } from "@nestjs/common";
import { kernel, User, Prisma } from "@saas/core-platform";

@Injectable()
export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return kernel.db.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return kernel.db.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return kernel.db.user.create({
      data,
    });
  }
}
