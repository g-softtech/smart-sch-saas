import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { kernel } from "@saas/core-platform";

@Injectable()
export class PlatformAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Authenticate user
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authentication token missing");
    }

    // 2. Fetch the user to verify globalRole
    const user = await kernel.db.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // 3. Verify User.globalRole === 'SUPER_ADMIN'
    // Do NOT rely on tenant-scoped role or x-tenant-id here.
    if (user.globalRole !== "SUPER_ADMIN") {
      throw new ForbiddenException(
        "Platform administration access is restricted to global Super Admins",
      );
    }

    return true;
  }
}
