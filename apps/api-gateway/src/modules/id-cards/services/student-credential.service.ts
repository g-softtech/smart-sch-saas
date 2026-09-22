import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { StudentCredentialRepository } from "../repositories/student-credential.repository";
import { randomUUID, createHmac } from "crypto";
import { kernel } from "@saas/core-platform";

@Injectable()
export class StudentCredentialService {
  // In a real scenario, this would be injected via config
  private readonly SECRET_KEY = process.env.CREDENTIAL_SECRET || "fallback-secret-key-do-not-use-in-prod";

  constructor(private readonly repository: StudentCredentialRepository) {}

  private hashToken(token: string): string {
    return createHmac("sha256", this.SECRET_KEY).update(token).digest("hex");
  }

  async issueCredential(tenantId: string, schoolId: string, studentId: string) {
    // 1. Check if an active credential already exists
    const existing = await this.repository.findActiveByStudent(tenantId, schoolId, studentId);
    if (existing) {
      throw new BadRequestException("Student already has an active ID card credential. Revoke it before issuing a new one.");
    }

    // 2. Generate opaque token (high entropy UUID)
    const token = randomUUID();
    const credentialHash = this.hashToken(token);

    // 3. Create the DB record
    const credential = await this.repository.create({
      tenantId,
      schoolId,
      studentId,
      credentialType: "QR",
      credentialHash,
      status: "ACTIVE", // Or ISSUED depending on lifecycle
    });

    return { credential, token };
  }

  async revokeCredential(tenantId: string, schoolId: string, credentialId: string, reason?: string) {
    // Note: The controller should ensure the user has permission to revoke credentials
    // The repository checks are scoped to tenantId via PlatformKernel if properly configured
    return this.repository.revoke(credentialId, reason);
  }

  async getCredentialsForStudent(tenantId: string, schoolId: string, studentId: string) {
    return this.repository.findAllByStudent(tenantId, schoolId, studentId);
  }

  async verifyCredential(
    tenantId: string,
    schoolId: string,
    operatorId: string,
    rawToken: string,
    source: "CAMERA" | "EXTERNAL"
  ) {
    let auditStatus = "FAILED";
    let auditReason = "UNKNOWN";
    let studentInfo = null;

    try {
      // 1. Hash the token
      const credentialHash = this.hashToken(rawToken);

      // 2. Lookup scoped by workspace (tenant/school)
      const credential = await this.repository.findByHashAndWorkspace(tenantId, schoolId, credentialHash);
      
      if (!credential) {
        auditReason = "NOT_FOUND_OR_WRONG_WORKSPACE";
        throw new BadRequestException("Credential could not be verified");
      }

      // 3. Lifecycle check
      if (credential.status !== "ACTIVE") {
        auditReason = `INVALID_STATE_${credential.status}`;
        throw new BadRequestException("Credential could not be verified");
      }

      // 4. Success
      auditStatus = "SUCCESS";
      auditReason = "VERIFIED";
      studentInfo = {
        id: credential.student.id,
        firstName: credential.student.firstName,
        lastName: credential.student.lastName,
        studentNumber: credential.student.studentNumber,
        status: credential.student.status,
      };

      return {
        success: true,
        student: studentInfo,
      };

    } finally {
      // 5. Persistent Audit
      try {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "QR_SCAN",
            entity: "StudentCredential",
            entityId: schoolId,
            metadata: {
              status: auditStatus,
              reason: auditReason,
              source,
              studentId: studentInfo?.id || null,
            }
          }
        });
      } catch (e) {
        console.error("Failed to write audit log:", e);
      }
    }
  }
}
