import { Injectable, BadRequestException } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { randomUUID, createHmac } from "crypto";

@Injectable()
export class GuardianCredentialService {
  private readonly SECRET_KEY = process.env.CREDENTIAL_SECRET || "fallback-secret-key-do-not-use-in-prod";

  private hashToken(token: string): string {
    return createHmac("sha256", this.SECRET_KEY).update(token).digest("hex");
  }

  async issueCredential(tenantId: string, guardianId: string, operatorId: string) {
    // Revoke any existing active credentials for this guardian
    await kernel.db.guardianCredential.updateMany({
      where: {
        tenantId,
        guardianId,
        status: "ACTIVE",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      }
    });

    const token = randomUUID();
    const credentialHash = this.hashToken(token);

    const credential = await kernel.db.guardianCredential.create({
      data: {
        tenantId,
        guardianId,
        credentialType: "QR",
        credentialHash,
        status: "ACTIVE",
      },
    });

    await kernel.db.auditLog.create({
      data: {
        tenantId,
        userId: operatorId,
        action: "GUARDIAN_CREDENTIAL_ISSUED",
        entity: "GuardianCredential",
        entityId: credential.id,
        metadata: { guardianId }
      }
    });

    return { credential, token };
  }

  async revokeCredential(tenantId: string, credentialId: string, operatorId: string) {
    const credential = await kernel.db.guardianCredential.findUnique({
      where: { id: credentialId }
    });

    if (!credential || credential.tenantId !== tenantId) {
      throw new BadRequestException("Credential not found");
    }

    const updated = await kernel.db.guardianCredential.update({
      where: { id: credentialId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      }
    });

    await kernel.db.auditLog.create({
      data: {
        tenantId,
        userId: operatorId,
        action: "GUARDIAN_CREDENTIAL_REVOKED",
        entity: "GuardianCredential",
        entityId: credential.id,
        metadata: { guardianId: credential.guardianId }
      }
    });

    return updated;
  }

  async verifyCredential(
    tenantId: string,
    rawToken: string,
    operatorId: string,
    source: string
  ) {
    let auditStatus = "FAILED";
    let auditReason = "UNKNOWN";
    let guardianInfo = null;

    try {
      const credentialHash = this.hashToken(rawToken);

      // Verify the credential exists and belongs to the workspace
      const credential = await kernel.db.guardianCredential.findUnique({
        where: {
          tenantId_credentialHash: {
            tenantId,
            credentialHash
          }
        },
        include: { guardian: true }
      });

      if (!credential) {
        auditReason = "NOT_FOUND_OR_WRONG_WORKSPACE";
        throw new BadRequestException("Guardian credential could not be verified");
      }

      if (credential.status !== "ACTIVE") {
        auditReason = `INVALID_STATE_${credential.status}`;
        throw new BadRequestException("Guardian credential could not be verified");
      }

      if (credential.expiresAt && credential.expiresAt < new Date()) {
        auditReason = "EXPIRED";
        throw new BadRequestException("Guardian credential is expired");
      }

      auditStatus = "SUCCESS";
      auditReason = "VERIFIED";
      guardianInfo = credential.guardian;

      return {
        success: true,
        guardian: guardianInfo,
        credentialId: credential.id
      };

    } finally {
      try {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "GUARDIAN_QR_SCAN",
            entity: "GuardianCredential",
            entityId: guardianInfo ? guardianInfo.id : "unknown",
            metadata: {
              status: auditStatus,
              reason: auditReason,
              source,
            }
          }
        });
      } catch (e) {
        console.error("Failed to write audit log:", e);
      }
    }
  }
}
