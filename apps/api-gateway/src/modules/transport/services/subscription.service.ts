import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { kernel, AuditService, TransportSubscriptionStatus } from "@saas/core-platform";
import { CreateSubscriptionDto } from "../dto/subscription.dto";

@Injectable()
export class SubscriptionService {
  constructor(private auditService: AuditService) {}

  async createSubscription(tenantId: string, schoolId: string, userId: string, dto: CreateSubscriptionDto) {
    return kernel.db.$transaction(async (tx) => {
      // 1. Validate Student
      const student = await tx.student.findUnique({ where: { id: dto.studentId } });
      if (!student || student.tenantId !== tenantId || student.schoolId !== schoolId) {
        throw new NotFoundException("Student not found or tenant mismatch.");
      }

      // 2. Acquire TWO pessimistic row-level locks (in deterministic order to prevent deadlocks):
      //    A) Student lock: serializes duplicate-direction subscriptions for the same student
      //    B) RouteAllocation lock: serializes concurrent capacity checks for the same allocation
      //    Table names from @@map directives in schema.prisma
      await tx.$queryRawUnsafe(
        `SELECT id FROM stud_students WHERE id = $1 FOR UPDATE`,
        dto.studentId
      );
      await tx.$queryRawUnsafe(
        `SELECT id FROM trp_route_allocations WHERE id = $1 FOR UPDATE`,
        dto.routeAllocationId
      );

      // 3. Load full allocation details (locks already held)
      const allocation = await tx.transportRouteAllocation.findFirst({
        where: { id: dto.routeAllocationId, tenantId, schoolId, termId: dto.termId },
        include: { route: true, vehicle: true }
      });
      if (!allocation) throw new NotFoundException("Route allocation not found for this term.");

      if (allocation.route.direction !== dto.direction) {
        throw new ConflictException("Subscription direction does not match route direction.");
      }

      // 4. Validate Stop
      const stop = await tx.transportRouteStop.findFirst({
        where: { id: dto.stopId, routeId: allocation.routeId }
      });
      if (!stop) throw new NotFoundException("Stop does not belong to this route.");

      // 5. Directional Uniqueness (serialized by student lock above)
      const existingActive = await tx.transportSubscription.findFirst({
        where: { studentId: dto.studentId, termId: dto.termId, direction: dto.direction, status: TransportSubscriptionStatus.ACTIVE }
      });
      if (existingActive) {
        throw new ConflictException(`Student already has an ACTIVE ${dto.direction} subscription for this term.`);
      }

      // 6. Capacity Enforcement (serialized by allocation lock above)
      const activeCount = await tx.transportSubscription.count({
        where: { routeAllocationId: dto.routeAllocationId, status: TransportSubscriptionStatus.ACTIVE }
      });
      if (activeCount >= allocation.vehicle.capacity) {
        throw new ConflictException("Route allocation capacity exhausted.");
      }

      // 7. Create Subscription
      const sub = await tx.transportSubscription.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          routeAllocationId: dto.routeAllocationId,
          stopId: dto.stopId,
          direction: dto.direction,
          status: TransportSubscriptionStatus.ACTIVE
        }
      });

      await this.auditService.logAction(tx as any, { action: "TRANSPORT_SUBSCRIPTION_CREATED", entity: "TransportSubscription", entityId: sub.id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: {}, current: sub }, ipAddress: "127.0.0.1" });

      return sub;
    }, { timeout: 15000 });
  }

  async cancelSubscription(tenantId: string, schoolId: string, id: string, userId: string) {
    return kernel.db.$transaction(async (tx) => {
      const sub = await tx.transportSubscription.findFirst({
        where: { id, tenantId, schoolId, status: TransportSubscriptionStatus.ACTIVE }
      });
      if (!sub) throw new NotFoundException("Active subscription not found.");

      const updated = await tx.transportSubscription.update({
        where: { id },
        data: { status: TransportSubscriptionStatus.CANCELLED }
      });

      await this.auditService.logAction(tx as any, { action: "TRANSPORT_SUBSCRIPTION_CANCELLED", entity: "TransportSubscription", entityId: id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: sub, current: updated }, ipAddress: "127.0.0.1" });
      return updated;
    });
  }
}
