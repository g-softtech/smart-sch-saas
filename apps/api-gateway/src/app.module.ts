import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from '@saas/core-platform/dist/tenant/tenant.middleware.js';
import { IdentityModule } from './modules/identity/identity.module';
import { AcademicsModule } from './modules/academics/academics.module';

@Module({
  imports: [IdentityModule, AcademicsModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
