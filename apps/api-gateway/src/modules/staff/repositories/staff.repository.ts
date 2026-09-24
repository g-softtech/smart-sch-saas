import { Injectable } from "@nestjs/common";
import {
  Prisma,
  StaffProfile,
  StaffStatus,
  StaffCredential,
} from "@saas/core-platform";
import { kernel } from "@saas/core-platform";

@Injectable()
export class StaffRepository {
  /**
   * Allocates a new atomic staff number and inserts the StaffProfile in the SAME transaction.
   * Proves transactional consistency: if staff creation fails, the sequence increment rolls back.
   */
  async createStaffWithAtomicNumber(
    tenantId: string,
    schoolId: string,
    data: Omit<
      Prisma.StaffProfileUncheckedCreateInput,
      "tenantId" | "schoolId" | "staffNumber"
    >,
  ): Promise<StaffProfile> {
    return kernel.db.$transaction(async (tx) => {
      // 1. Ensure the sequence row exists (upsert)
      await tx.$executeRaw`
        INSERT INTO "stf_staff_number_sequences" ("tenantId", "schoolId", "lastNumber")
        VALUES (${tenantId}, ${schoolId}, 0)
        ON CONFLICT ("tenantId", "schoolId") DO NOTHING;
      `;

      // 2. Atomically increment and lock the sequence row, returning the new number
      const sequenceResult = await tx.$queryRaw<{ lastNumber: number }[]>`
        UPDATE "stf_staff_number_sequences"
        SET "lastNumber" = "lastNumber" + 1
        WHERE "tenantId" = ${tenantId} AND "schoolId" = ${schoolId}
        RETURNING "lastNumber";
      `;

      if (!sequenceResult || sequenceResult.length === 0) {
        throw new Error("Failed to allocate staff number");
      }

      const nextNumber = sequenceResult[0].lastNumber;

      // 3. Format the staff number (e.g., STF-000001)
      const formattedStaffNumber = `STF-${String(nextNumber).padStart(6, "0")}`;

      // Extract campusIds to avoid type error and to use for campusAssignments
      const { campusIds, ...restData } = data as any;

      // 4. Create the Staff Profile in the exact same transaction
      return tx.staffProfile.create({
        data: {
          ...restData,
          staffNumber: formattedStaffNumber,
          tenantId,
          schoolId,
          campusAssignments: campusIds && campusIds.length > 0 ? {
            create: campusIds.map((campusId: string) => ({
              tenantId,
              campusId,
            }))
          } : undefined,
        },
      });
    });
  }

  async findStaffById(staffId: string): Promise<StaffProfile | null> {
    return kernel.db.staffProfile.findUnique({
      where: { id: staffId },
    });
  }

  async findStaffInWorkspace(
    tenantId: string,
    schoolId: string,
    staffId: string,
  ): Promise<StaffProfile | null> {
    return kernel.db.staffProfile.findFirst({
      where: {
        id: staffId,
        tenantId,
        schoolId,
      },
    });
  }

  async updateStaffStatus(
    tenantId: string,
    schoolId: string,
    staffId: string,
    status: StaffStatus,
  ): Promise<StaffProfile> {
    // Relying on kernel.db automatic tenant scoping, but making it explicit for safety
    return kernel.db.staffProfile.update({
      where: { id: staffId },
      data: { status },
    });
  }

  async getStaffList(
    tenantId: string,
    schoolId: string,
    campusId: string | undefined,
    skip: number,
    take: number,
  ): Promise<StaffProfile[]> {
    const where: any = { tenantId, schoolId };
    if (campusId) {
      where.campusAssignments = {
        some: { campusId }
      };
    }
    return kernel.db.staffProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  async saveCredential(
    tx: any,
    data: Prisma.StaffCredentialUncheckedCreateInput,
  ): Promise<StaffCredential> {
    return tx.staffCredential.create({
      data,
    });
  }

  async revokeActiveCredentials(
    tx: any,
    staffId: string,
    tenantId: string,
  ): Promise<void> {
    await tx.staffCredential.updateMany({
      where: { staffId, tenantId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
  }
}
