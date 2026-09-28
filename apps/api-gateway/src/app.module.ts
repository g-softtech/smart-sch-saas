import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { TenantMiddleware } from "@saas/core-platform/dist/tenant/tenant.middleware.js";
import { IdentityModule } from "./modules/identity/identity.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { AcademicsModule } from "./modules/academics/academics.module";
import { StudentsModule } from "./modules/students/students.module";
import { AdmissionsModule } from "./modules/admissions/admissions.module";
import { StaffModule } from "./modules/staff/staff.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AppController } from "./app.controller";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { IdCardsModule } from "./modules/id-cards/id-cards.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { OutboxWorkerModule } from "./modules/outbox-worker/outbox-worker.module";

import { MovementModule } from "./modules/movement/movement.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { CBTModule } from "./modules/cbt/cbt.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { PortalStudentModule } from "./modules/portal-student/portal-student.module";
import { PortalParentModule } from "./modules/portal-parent/portal-parent.module";
import { PortalAccountModule } from "./modules/portal-account/portal-account.module";
import { PortalTeacherModule } from "./modules/portal-teacher/portal-teacher.module";
import { EntitlementsModule } from "./modules/entitlements/entitlements.module";

@Module({
  imports: [
    IdentityModule,
    PaymentsModule,
    AcademicsModule,
    StudentsModule,
    AdmissionsModule,
    StaffModule,
    AttendanceModule,
    NotificationsModule,
    IdCardsModule,
    OutboxWorkerModule,
    MovementModule,
    AssignmentsModule,
    CBTModule,
    FinanceModule,
    PortalStudentModule,
    PortalParentModule,
    PortalAccountModule,
    PortalTeacherModule,
    EntitlementsModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
