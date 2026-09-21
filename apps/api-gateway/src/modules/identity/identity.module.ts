import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

// Repositories
import { RoleRepository } from "./repositories/role.repository";
import { TenantMembershipRepository } from "./repositories/tenant-membership.repository";
import { TenantRepository } from "./repositories/tenant.repository";
import { UserRepository } from "./repositories/user.repository";

// Services
import { AuthenticationService } from "./services/authentication.service";
import { RegistrationService } from "./services/registration.service";

// Security & Interceptors
import { PoliciesGuard } from "./security/policies.guard";
import { WorkspaceContextInterceptor } from "./interceptors/workspace-context.interceptor";
import { JwtAuthGuard } from "./security/jwt-auth.guard";

// Controllers
import { AuthController } from "./controllers/auth.controller";
import { IdentityController } from "./controllers/identity.controller";

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET || "super-secret-default-key-do-not-use-in-prod",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [AuthController, IdentityController],
  providers: [
    RoleRepository,
    TenantMembershipRepository,
    TenantRepository,
    UserRepository,
    AuthenticationService,
    RegistrationService,
    PoliciesGuard,
    WorkspaceContextInterceptor,
    JwtAuthGuard,
  ],
  exports: [
    RoleRepository,
    TenantMembershipRepository,
    TenantRepository,
    UserRepository,
    AuthenticationService,
    RegistrationService,
    PoliciesGuard,
    WorkspaceContextInterceptor,
    JwtAuthGuard,
  ],
})
export class IdentityModule {}
