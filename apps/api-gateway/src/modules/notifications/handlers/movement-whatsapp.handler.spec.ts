import { Test, TestingModule } from "@nestjs/testing";
import { MovementWhatsAppNotificationHandler } from "./movement-whatsapp.handler";
import { WhatsAppProvider } from "../providers/whatsapp.provider";
import { IdempotencyService, kernel } from "@saas/core-platform";

// Mock kernel.db
jest.mock("@saas/core-platform", () => {
  const originalModule = jest.requireActual("@saas/core-platform");
  return {
    ...originalModule,
    kernel: {
      db: {
        studentGuardian: {
          findFirst: jest.fn(),
        },
      },
    },
  };
});

describe("MovementWhatsAppNotificationHandler", () => {
  let handler: MovementWhatsAppNotificationHandler;
  let whatsappProvider: WhatsAppProvider;
  let idempotencyService: IdempotencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementWhatsAppNotificationHandler,
        {
          provide: WhatsAppProvider,
          useValue: {
            sendTemplateMessage: jest.fn(),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            // Mock to just execute the handler directly
            withIdempotency: jest.fn().mockImplementation(async (db, name, eventId, fn) => {
              return fn();
            }),
          },
        },
      ],
    }).compile();

    handler = module.get<MovementWhatsAppNotificationHandler>(MovementWhatsAppNotificationHandler);
    whatsappProvider = module.get<WhatsAppProvider>(WhatsAppProvider);
    idempotencyService = module.get<IdempotencyService>(IdempotencyService);
    
    jest.clearAllMocks();
  });

  const baseEvent = {
    eventId: "evt-123",
    eventType: "StudentArrivalEvent",
    aggregateId: "dep-123",
    aggregateType: "StudentArrival",
    version: 1,
    occurredAt: new Date(),
    correlationId: "evt-123",
    tenantId: "tenant-1",
    payload: {
      tenantId: "tenant-1",
      schoolId: "school-1",
      studentId: "student-1",
      timestamp: new Date().toISOString(),
    },
  };

  it("should securely fetch primary guardian isolated to tenant and school and send WhatsApp", async () => {
    // Mock the DB response
    (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValueOnce({
      tenantId: "tenant-1",
      studentId: "student-1",
      guardianId: "guardian-1",
      isPrimary: true,
      guardian: {
        id: "guardian-1",
        phone: "08031112233", // valid Nigerian
      },
      student: {
        id: "student-1",
        firstName: "Alice",
        school: {
          id: "school-1",
          name: "Acme School",
        },
      },
    });

    await handler.handleStudentArrival(baseEvent);

    expect(kernel.db.studentGuardian.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        studentId: "student-1",
        isPrimary: true,
        student: {
          tenantId: "tenant-1",
          schoolId: "school-1",
        },
      },
      include: expect.any(Object),
    });

    expect(whatsappProvider.sendTemplateMessage).toHaveBeenCalledWith({
      to: "2348031112233",
      templateName: "student_arrival_template",
      parameters: ["Acme School", "Alice", expect.any(String), expect.any(String)],
    });
  });

  it("should safely skip if no primary guardian is found (no infinite retry)", async () => {
    (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValueOnce(null);

    await handler.handleStudentDeparture({
      ...baseEvent,
      eventType: "StudentDepartureEvent"
    });

    expect(whatsappProvider.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("should safely skip if primary guardian lacks a valid phone number", async () => {
    (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValueOnce({
      guardian: { phone: "123" }, // Invalid format
      student: { firstName: "Alice", school: { name: "Acme" } },
    });

    await handler.handleStudentArrival(baseEvent);

    expect(whatsappProvider.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("should propagate transient WhatsApp failures up so EventDispatcher retries them", async () => {
    (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValueOnce({
      guardian: { phone: "08031112233" },
      student: { firstName: "Alice", school: { name: "Acme" } },
    });

    (whatsappProvider.sendTemplateMessage as jest.Mock).mockRejectedValueOnce(
      new Error("WhatsApp API timeout")
    );

    await expect(handler.handleStudentArrival(baseEvent)).rejects.toThrow("WhatsApp API timeout");
  });

  it("should correctly format distinct templates for departure vs arrival", async () => {
    (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValue({
      guardian: { phone: "08031112233" },
      student: { firstName: "Alice", school: { name: "Acme" } },
    });

    await handler.handleStudentArrival(baseEvent);
    expect(whatsappProvider.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: "student_arrival_template" })
    );

    await handler.handleStudentDeparture({ ...baseEvent, eventType: "StudentDepartureEvent" });
    expect(whatsappProvider.sendTemplateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: "student_departure_template" })
    );
  });
});
