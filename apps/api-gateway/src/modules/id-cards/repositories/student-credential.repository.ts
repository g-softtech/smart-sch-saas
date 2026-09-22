import { Injectable } from "@nestjs/common";
import { kernel, CredentialStatus } from "@saas/core-platform";

@Injectable()
export class StudentCredentialRepository {
  async create(data: {
    tenantId: string;
    schoolId: string;
    studentId: string;
    credentialHash: string;
    credentialType: "QR";
    status: CredentialStatus;
  }) {
    return kernel.db.studentCredential.create({
      data,
    });
  }

  async findActiveByStudent(tenantId: string, schoolId: string, studentId: string) {
    return kernel.db.studentCredential.findFirst({
      where: {
        tenantId,
        schoolId,
        studentId,
        status: CredentialStatus.ACTIVE,
      },
    });
  }

  async findByHashAndWorkspace(tenantId: string, schoolId: string, credentialHash: string) {
    return kernel.db.studentCredential.findFirst({
      where: {
        tenantId,
        schoolId,
        credentialHash,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentNumber: true,
            status: true,
          }
        }
      }
    });
  }

  async revoke(id: string, reason?: string) {
    return kernel.db.studentCredential.update({
      where: { id },
      data: {
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  async findAllByStudent(tenantId: string, schoolId: string, studentId: string) {
    return kernel.db.studentCredential.findMany({
      where: { tenantId, schoolId, studentId },
      orderBy: { issuedAt: "desc" },
    });
  }
}
