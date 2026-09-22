import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { EventDispatcher } from '@saas/core-platform';

@Injectable()
export class OutboxWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;
  private currentProcessingPromise: Promise<void> | null = null;

  constructor(private readonly dispatcher: EventDispatcher) {}

  onApplicationBootstrap() {
    this.logger.log('Starting Outbox Worker...');
    this.startPolling();
  }

  async onApplicationShutdown() {
    this.logger.log('Shutting down Outbox Worker...');
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Wait for the currently active processing cycle to finish gracefully
    if (this.currentProcessingPromise) {
      await this.currentProcessingPromise;
    }
  }

  private startPolling() {
    // Poll every 10 seconds
    this.timer = setInterval(() => {
      if (this.isShuttingDown || this.isProcessing) return;

      this.isProcessing = true;
      this.currentProcessingPromise = this.processPendingEvents();
    }, 10000);
  }

  private async processPendingEvents() {
    try {
      const count = await this.dispatcher.dispatchPending(100);
      if (count > 0) {
        this.logger.debug(`Dispatched ${count} outbox events.`);
      }
    } catch (error) {
      this.logger.error('Error during outbox dispatch', error);
    } finally {
      this.isProcessing = false;
      this.currentProcessingPromise = null;
    }
  }
}
