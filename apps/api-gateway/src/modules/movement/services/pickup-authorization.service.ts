import { Injectable, BadRequestException } from "@nestjs/common";
import { kernel } from "@saas/core-platform";

@Injectable()
export class PickupAuthorizationService {

  async createAuthorization(
    tenantId: string,
    schoolId: string,
    studentId: string,
    guardianId: string,
    validFrom: Date,
    validUntil: Date | null,
    operatorId: string
  ) {
    // 1. Verify student and guardian exist and are in the same tenant/school context
    const student = await kernel.db.student.findFirst({
      where: { id: studentId, tenantId, schoolId }
    });
    if (!student) throw new BadRequestException("Student not found in this school");

    const guardian = await kernel.db.guardian.findFirst({
      where: { id: guardianId, tenantId }
    });
    if (!guardian) throw new BadRequestException("Guardian not found in this tenant");

    // 2. Verify the declared relationship exists in the system
    const relationship = await kernel.db.studentGuardian.findFirst({
      where: { studentId, guardianId, tenantId }
    });
    if (!relationship) throw new BadRequestException("Guardian does not have a declared relationship with this student");

    // 3. Create the authorization
    const authorization = await kernel.db.pickupAuthorization.create({
      data: {
        tenantId,
        schoolId,
        studentId,
        guardianId,
        validFrom,
        validUntil,
        status: "ACTIVE",
        createdById: operatorId
      }
    });

    await kernel.db.auditLog.create({
      data: {
        tenantId,
        userId: operatorId,
        action: "PICKUP_AUTHORIZATION_CREATED",
        entity: "PickupAuthorization",
        entityId: authorization.id,
        metadata: { studentId, guardianId, validFrom, validUntil }
      }
    });

    return authorization;
  }

  async revokeAuthorization(
    tenantId: string,
    schoolId: string,
    authorizationId: string,
    operatorId: string
  ) {
    const auth = await kernel.db.pickupAuthorization.findFirst({
      where: { id: authorizationId, tenantId, schoolId }
    });

    if (!auth) {
      throw new BadRequestException("Authorization not found");
    }

    const updated = await kernel.db.pickupAuthorization.update({
      where: { id: authorizationId },
      data: {
        status: "REVOKED",
        revokedById: operatorId,
        revokedAt: new Date()
      }
    });

    await kernel.db.auditLog.create({
      data: {
        tenantId,
        userId: operatorId,
        action: "PICKUP_AUTHORIZATION_REVOKED",
        entity: "PickupAuthorization",
        entityId: authorizationId,
        metadata: { studentId: auth.studentId, guardianId: auth.guardianId }
      }
    });

    return updated;
  }

  async verifyPickupAuthorization(
    tenantId: string,
    schoolId: string,
    studentId: string,
    guardianId: string,
    verificationTime: Date
  ) {
    const activeAuth = await kernel.db.pickupAuthorization.findFirst({
      where: {
        tenantId,
        schoolId,
        studentId,
        guardianId,
        status: "ACTIVE",
        validFrom: { lte: verificationTime },
        OR: [
          { validUntil: null },
          { validUntil: { gt: verificationTime } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeAuth) {
      throw new BadRequestException("Guardian is not authorized for this student");
    }

    return activeAuth;
  }
}
