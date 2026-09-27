import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
const { kernel } = require("@saas/core-platform/dist/index.js");
import { CreateParentPickupAuthorizationDto, PayInvoiceDto } from "../dto/parent-portal.dto";

@Injectable()
export class ParentPortalService {
  /**
   * Zero-Trust Server-Side Guardian Identity Resolution.
   * Resolves Guardian exclusively via authenticated User ID (req.user.sub).
   */
  async resolveGuardian(userId: string, tenantId: string) {
    const guardian = await kernel.db.guardian.findFirst({
      where: {
        tenantId,
        userId,
      },
      include: {
        students: {
          include: {
            student: {
              include: {
                school: { select: { id: true, name: true } },
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: {
                    class: { select: { id: true, name: true } },
                    arm: { select: { id: true, name: true } },
                  },
                },
                photo: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException(
        "Authenticated user is not linked to an active Guardian profile"
      );
    }

    return guardian;
  }

  /**
   * Helper to verify that the specified child belongs to the authenticated guardian.
   */
  private verifyChildAuthorization(guardian: any, childId: string) {
    const isLinked = guardian.students.some(
      (sg: any) => sg.student.id === childId
    );
    if (!isLinked) {
      throw new ForbiddenException(
        "You do not have authorization to view or manage data for this child"
      );
    }
  }

  async getProfile(userId: string, tenantId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    return {
      id: guardian.id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      phone: guardian.phone,
      email: guardian.email,
      address: guardian.address,
      occupation: guardian.occupation,
      linkedChildrenCount: guardian.students.length,
    };
  }

  async getDashboard(userId: string, tenantId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    const linkedChildren = guardian.students.map((sg: any) => {
      const s = sg.student;
      const activeEnrollment = s.enrollments[0];
      return {
        id: s.id,
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        relationship: sg.relationship,
        isPrimary: sg.isPrimary,
        schoolName: s.school?.name || "N/A",
        className: activeEnrollment?.class?.name || "N/A",
        armName: activeEnrollment?.arm?.name || null,
      };
    });

    const studentIds = linkedChildren.map((c: any) => c.id);

    // Query unpaid invoices for guardian's children
    const unpaidInvoices = await kernel.db.invoice.findMany({
      where: {
        tenantId,
        studentId: { in: studentIds },
        status: { in: ["ISSUED", "PARTIAL"] },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    // Query recent departures/pickups for guardian's children
    const recentDepartures = await kernel.db.studentDeparture.findMany({
      where: {
        tenantId,
        studentId: { in: studentIds },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    return {
      guardian: {
        id: guardian.id,
        name: `${guardian.firstName} ${guardian.lastName}`,
        email: guardian.email,
      },
      children: linkedChildren,
      pendingInvoices: unpaidInvoices,
      recentDepartures,
    };
  }

  async getChildren(userId: string, tenantId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    return guardian.students.map((sg: any) => {
      const s = sg.student;
      const activeEnrollment = s.enrollments[0];
      return {
        id: s.id,
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        relationship: sg.relationship,
        isPrimary: sg.isPrimary,
        isEmergencyContact: sg.isEmergencyContact,
        school: s.school || null,
        class: activeEnrollment?.class || null,
        arm: activeEnrollment?.arm || null,
        hasPhoto: !!s.photo,
      };
    });
  }

  async getChildResults(userId: string, tenantId: string, childId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    this.verifyChildAuthorization(guardian, childId);

    const child = guardian.students.find((sg: any) => sg.student.id === childId)?.student;
    const enrollmentIds = child.enrollments.map((e: any) => e.id);

    return kernel.db.subjectResult.findMany({
      where: {
        tenantId,
        enrollmentId: { in: enrollmentIds },
      },
      include: {
        subject: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        scores: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getChildAttendance(userId: string, tenantId: string, childId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    this.verifyChildAuthorization(guardian, childId);

    const child = guardian.students.find((sg: any) => sg.student.id === childId)?.student;
    const enrollmentIds = child.enrollments.map((e: any) => e.id);

    const [attendanceRecords, arrivals] = await Promise.all([
      kernel.db.attendanceRecord.findMany({
        where: {
          tenantId,
          enrollmentId: { in: enrollmentIds },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      kernel.db.studentArrival.findMany({
        where: {
          tenantId,
          studentId: childId,
        },
        orderBy: { arrivalTime: "desc" },
        take: 30,
      }),
    ]);

    return {
      attendanceRecords,
      arrivals,
    };
  }

  async getChildMovement(userId: string, tenantId: string, childId: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    this.verifyChildAuthorization(guardian, childId);

    const [departures, pickupAuthorizations] = await Promise.all([
      kernel.db.studentDeparture.findMany({
        where: {
          tenantId,
          studentId: childId,
        },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
      kernel.db.pickupAuthorization.findMany({
        where: {
          tenantId,
          studentId: childId,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      departures,
      pickupAuthorizations,
    };
  }

  async createPickupAuthorization(
    userId: string,
    tenantId: string,
    childId: string,
    dto: CreateParentPickupAuthorizationDto
  ) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    this.verifyChildAuthorization(guardian, childId);

    const child = guardian.students.find((sg: any) => sg.student.id === childId)?.student;
    const activeEnrollment = child.enrollments[0];
    if (!activeEnrollment) {
      throw new BadRequestException("Child has no active enrollment to authorize pickup for");
    }

    return kernel.db.pickupAuthorization.create({
      data: {
        tenantId,
        schoolId: child.schoolId,
        studentId: childId,
        guardianId: guardian.id,
        notes: dto.notes ? `${dto.authorizedPersonName} (${dto.relationship}) - ${dto.phone}. ${dto.notes}` : `${dto.authorizedPersonName} (${dto.relationship}) - ${dto.phone}`,
        createdById: userId,
        status: "ACTIVE",
      },
    });
  }

  async getInvoices(userId: string, tenantId: string, childId?: string) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    if (childId) {
      this.verifyChildAuthorization(guardian, childId);
    }

    const targetStudentIds = childId
      ? [childId]
      : guardian.students.map((sg: any) => sg.student.id);

    return kernel.db.invoice.findMany({
      where: {
        tenantId,
        studentId: { in: targetStudentIds },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
        lineItems: true,
        allocations: true,
      },
      orderBy: { dueDate: "asc" },
    });
  }

  async payInvoice(
    userId: string,
    tenantId: string,
    invoiceId: string,
    dto: PayInvoiceDto
  ) {
    const guardian = await this.resolveGuardian(userId, tenantId);
    const invoice = await kernel.db.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        student: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Verify invoice belongs to one of guardian's linked children
    this.verifyChildAuthorization(guardian, invoice.studentId);

    const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
    const totalAmount = Number(invoice.totalAmount);
    let newStatus = invoice.status;

    if (newPaidAmount >= totalAmount) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    }

    const methodStr = (dto.paymentMethod || "ONLINE").toUpperCase();
    const validMethod = ["CASH", "TRANSFER", "POS", "ONLINE"].includes(methodStr)
      ? methodStr
      : "ONLINE";

    const reference = dto.reference || `PAY-PAR-${Date.now()}`;

    return kernel.db.$transaction(async (tx: any) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          schoolId: invoice.schoolId,
          studentId: invoice.studentId,
          amount: dto.amount,
          method: validMethod as any,
          reference,
          status: "SUCCESS",
          paymentDate: new Date(),
          allocations: {
            create: {
              invoiceId: invoice.id,
              amountAllocated: dto.amount,
            },
          },
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return payment;
    });
  }
}
