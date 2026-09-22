import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorkerService } from './outbox-worker.service';
import { EventDispatcher } from '@saas/core-platform';

describe('OutboxWorkerService', () => {
  let service: OutboxWorkerService;
  let dispatcher: jest.Mocked<EventDispatcher>;

  beforeEach(async () => {
    const mockDispatcher = {
      dispatchPending: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorkerService,
        {
          provide: EventDispatcher,
          useValue: mockDispatcher,
        },
      ],
    }).compile();

    service = module.get<OutboxWorkerService>(OutboxWorkerService);
    dispatcher = module.get(EventDispatcher);
  });

  afterEach(async () => {
    await service.onApplicationShutdown();
  });

  it('should start polling on bootstrap', () => {
    jest.useFakeTimers();
    service.onApplicationBootstrap();
    expect(dispatcher.dispatchPending).not.toHaveBeenCalled();

    jest.advanceTimersByTime(10000);
    expect(dispatcher.dispatchPending).toHaveBeenCalledWith(100);

    jest.useRealTimers();
  });

  it('should stop polling on shutdown', async () => {
    jest.useFakeTimers();
    service.onApplicationBootstrap();
    await service.onApplicationShutdown();
    
    jest.advanceTimersByTime(10000);
    expect(dispatcher.dispatchPending).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
