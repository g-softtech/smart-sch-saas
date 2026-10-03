import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { kernel, AuditService, TransportVehicleStatus } from "@saas/core-platform";
import { CreateVehicleDto, UpdateVehicleDto } from "../dto/fleet.dto";

@Injectable()
export class FleetService {
  constructor(private auditService: AuditService) {}

  async createVehicle(tenantId: string, schoolId: string, userId: string, dto: CreateVehicleDto) {
    const existing = await kernel.db.transportVehicle.findFirst({
      where: { tenantId, registrationNumber: dto.registrationNumber }
    });
    if (existing) {
      throw new ConflictException("Vehicle with this registration number already exists.");
    }

    return kernel.db.$transaction(async (tx) => {
      const vehicle = await tx.transportVehicle.create({
        data: {
          tenantId,
          schoolId,
          campusId: dto.campusId,
          registrationNumber: dto.registrationNumber,
          capacity: dto.capacity,
          status: TransportVehicleStatus.ACTIVE
        }
      });

      await this.auditService.logAction(tx as any, { action: "TRANSPORT_VEHICLE_CREATED", entity: "TransportVehicle", entityId: vehicle.id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: {}, current: vehicle }, ipAddress: "127.0.0.1" });

      return vehicle;
    });
  }

  async updateVehicle(tenantId: string, schoolId: string, id: string, userId: string, dto: UpdateVehicleDto) {
    const vehicle = await kernel.db.transportVehicle.findFirst({
      where: { id, tenantId, schoolId }
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found.");

    return kernel.db.$transaction(async (tx) => {
      const updated = await tx.transportVehicle.update({
        where: { id },
        data: dto
      });
      await this.auditService.logAction(tx as any, { action: "TRANSPORT_VEHICLE_UPDATED", entity: "TransportVehicle", entityId: id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: vehicle, current: updated }, ipAddress: "127.0.0.1" });
      return updated;
    });
  }

  async deleteVehicle(tenantId: string, schoolId: string, id: string, userId: string) {
    const vehicle = await kernel.db.transportVehicle.findFirst({
      where: { id, tenantId, schoolId },
      include: { allocations: true }
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found.");
    if (vehicle.allocations.length > 0) {
      throw new ConflictException("Cannot delete vehicle historically linked to route allocations. Retire it instead.");
    }

    return kernel.db.$transaction(async (tx) => {
      await tx.transportVehicle.delete({ where: { id } });
      await this.auditService.logAction(tx as any, { action: "TRANSPORT_VEHICLE_DELETED", entity: "TransportVehicle", entityId: id, tenantId: tenantId, userId: userId, severity: "MEDIUM", metadata: { schoolId: schoolId, previous: vehicle, current: {} }, ipAddress: "127.0.0.1" });
    });
  }
}

