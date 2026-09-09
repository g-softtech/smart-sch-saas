import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from '@saas/core-platform/dist/tenant/tenant.middleware.js';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
