import { Test, TestingModule } from "@nestjs/testing";
import { AdmissionsNotificationHandler } from "./admissions-notification.handler";
import { NotificationsService } from "../notifications.service";
import { IdempotencyService, DomainEvent } from "@saas/core-platform";

describe("AdmissionsNotificationHandler (Idempotency)", () => {
  let handler: AdmissionsNotificationHandler;
  let notificationsService: jest.Mocked<NotificationsService>;
  let idempotencyService: IdempotencyService;

  beforeEach(async () => {
    // A simplified in-memory idempotency implementation for testing
    const mockIdempotencyService = {
      processed: new Set<string>(),
      async withIdempotency(
        prisma: any,
        consumerName: string,
        eventId: string,
        fn: any,
      ) {
        const key = `${consumerName}:${eventId}`;
        if (this.processed.has(key)) return null;
        const result = await fn();
        this.processed.add(key);
        return result;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionsNotificationHandler,
        {
          provide: NotificationsService,
          useValue: { sendTransactionalEmail: jest.fn() },
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
      ],
    }).compile();

    handler = module.get<AdmissionsNotificationHandler>(
      AdmissionsNotificationHandler,
    );
    notificationsService = module.get(NotificationsService);
    idempotencyService = module.get(IdempotencyService);
  });

  it("first processing of an event dispatches the notification", async () => {
    const event = {
      eventId: "event_1",
      aggregateId: "agg_1",
      payload: {
        applicantId: "app_1",
        email: "test@example.com",
        firstName: "Test",
        trackingToken: "token_1",
      },
    } as unknown as DomainEvent;

    await handler.handleApplicationSubmitted(event);

    expect(notificationsService.sendTransactionalEmail).toHaveBeenCalledTimes(
      1,
    );
    expect(notificationsService.sendTransactionalEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
      expect.any(String),
    );
  });

  it("replay of the exact same event does not dispatch a second notification", async () => {
    const event = {
      eventId: "event_2",
      aggregateId: "agg_2",
      payload: {
        applicantId: "app_2",
        email: "test2@example.com",
        firstName: "Test2",
        trackingToken: "token_2",
      },
    } as unknown as DomainEvent;

    // First processing
    await handler.handleApplicationSubmitted(event);
    expect(notificationsService.sendTransactionalEmail).toHaveBeenCalledTimes(
      1,
    );

    // Replay exact same event
    await handler.handleApplicationSubmitted(event);
    expect(notificationsService.sendTransactionalEmail).toHaveBeenCalledTimes(
      1,
    ); // Still 1
  });
});
