import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { kernel, AuditService, TransportRouteStatus, StaffType } from "@saas/core-platform";
import { CreateRouteDto, SyncRouteStopsDto, CreateAllocationDto } from "../dto/route.dto";

@Injectable()
export class RouteService {
  constructor(private auditService: AuditService) {}

  async createRoute(tenantId: string, schoolId: string, userId: string, dto: CreateRouteDto) {
    return kernel.db.$transaction(async (tx) => {
      const route = await tx.transportRoute.create({
        data: {
          tenantId,
          schoolId,
          campusId: dto.campusId,
          name: dto.name,
          direction: dto.direction,
          status: TransportRouteStatus.ACTIVE
        }
      });
      await this.auditService.logAction(tx as any, { action: "TRANSPORT_ROUTE_CREATED", entity: "TransportRoute", entityId: route.id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: {}, current: route }, ipAddress: "127.0.0.1" });
      return route;
    });
  }

  async syncStops(tenantId: string, schoolId: string, routeId: string, userId: string, dto: SyncRouteStopsDto) {
    const route = await kernel.db.transportRoute.findFirst({
      where: { id: routeId, tenantId, schoolId }
    });
    if (!route) throw new NotFoundException("Route not found.");

    return kernel.db.$transaction(async (tx) => {
      // Basic implementation: delete all current stops not heavily referenced and recreate.
      // But stops might be referenced by subscriptions.
      // Safe implementation: only update or add. For simplicity MVP, we just wipe un-referenced ones.
      const currentStops = await tx.transportRouteStop.findMany({ where: { routeId } });
      for (const stop of currentStops) {
        const subs = await tx.transportSubscription.count({ where: { stopId: stop.id } });
        if (subs === 0) {
          await tx.transportRouteStop.delete({ where: { id: stop.id } });
        }
      }
      
      for (const s of dto.stops) {
        await tx.transportRouteStop.create({
          data: { routeId, name: s.name, estimatedTime: s.estimatedTime, cost: s.cost || 0, orderIndex: s.orderIndex }
        });
      }

      await this.auditService.logAction(tx as any, { action: "TRANSPORT_ROUTE_STOPS_SYNCED", entity: "TransportRoute", entityId: routeId, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: {}, current: {} }, ipAddress: "127.0.0.1" });
      return { success: true };
    });
  }

  async createAllocation(tenantId: string, schoolId: string, routeId: string, userId: string, dto: CreateAllocationDto) {
    const route = await kernel.db.transportRoute.findFirst({
      where: { id: routeId, tenantId, schoolId }
    });
    if (!route) throw new NotFoundException("Route not found.");

    const vehicle = await kernel.db.transportVehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, schoolId }
    });
    if (!vehicle || vehicle.status !== 'ACTIVE') throw new ConflictException("Invalid or inactive vehicle.");

    const driver = await kernel.db.staffProfile.findFirst({
      where: { id: dto.driverId, tenantId, schoolId }
    });
    if (!driver || (driver.type !== StaffType.SUPPORT && driver.type !== StaffType.NON_TEACHING)) {
      throw new ForbiddenException("Invalid driver. Must be SUPPORT or NON_TEACHING staff.");
    }

    const term = await kernel.db.term.findFirst({
      where: { id: dto.termId, academicYearId: dto.academicYearId, tenantId }
    });
    if (!term) throw new NotFoundException("Invalid term or academic year.");

    const existingAllocation = await kernel.db.transportRouteAllocation.findFirst({
      where: { tenantId, schoolId, routeId, termId: dto.termId }
    });
    if (existingAllocation) {
      throw new ConflictException("Route allocation already exists for this term.");
    }

    return kernel.db.$transaction(async (tx) => {
      const allocation = await tx.transportRouteAllocation.create({
        data: {
          tenantId, schoolId, routeId, academicYearId: dto.academicYearId, termId: dto.termId, vehicleId: dto.vehicleId, driverId: dto.driverId
        }
      });
      await this.auditService.logAction(tx as any, { action: "TRANSPORT_ALLOCATION_CREATED", entity: "TransportRouteAllocation", entityId: allocation.id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: {}, current: allocation }, ipAddress: "127.0.0.1" });
      return allocation;
    });
  }
}

