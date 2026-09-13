import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from '@saas/core-platform/dist/tenant/tenant.middleware.js';
import { IdentityModule } from './modules/identity/identity.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { StudentsModule } from './modules/students/students.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { StaffModule } from './modules/staff/staff.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    IdentityModule,
    AcademicsModule,
    StudentsModule,
    AdmissionsModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
