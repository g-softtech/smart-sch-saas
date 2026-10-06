import { Injectable } from "@nestjs/common";
import { kernel } from "@saas/core-platform";

@Injectable()
export class CBTService {
  constructor() {}

  async getExamsForClass(tenantId: string, classId: string, armId?: string): Promise<any> {
    return kernel.db.cBTExam.findMany({
      where: {
        tenantId,
        status: { in: ["PUBLISHED", "ACTIVE", "CLOSED"] },
        assessmentComponent: {
          classId,
          ...(armId ? { armId } : {})
        }
      },
      include: {
        assessmentComponent: true
      }
    });
  }
}
