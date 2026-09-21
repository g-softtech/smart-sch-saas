import { Controller, Post, Headers, Req, Res, Logger, HttpStatus, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { AdmissionsService } from '../../admissions/services/admissions.service';

@Controller('public/webhooks/paystack')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly secretKey: string;

  constructor(
    @Inject(forwardRef(() => AdmissionsService)) private admissionsService: AdmissionsService
  ) {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';
  }

  @Post()
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing signature');
    }

    // Verify signature
    // Need raw body for accurate signature verification, but NestJS parses JSON by default.
    // Assuming the body is already parsed, we can stringify it, but it's risky if fields are reordered.
    // For SchoolOS, we will stringify if rawBody isn't available.
    const bodyStr = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
    
    const hash = crypto.createHmac('sha512', this.secretKey).update(bodyStr).digest('hex');
    
    if (hash !== signature) {
      this.logger.warn(`Invalid Paystack signature. Expected: ${hash}, Got: ${signature}`);
      throw new UnauthorizedException('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      try {
        const reference = event.data.reference;
        const trackingToken = event.data.metadata?.trackingToken; // Passed during initialization

        if (!reference || !trackingToken) {
          throw new BadRequestException('Missing reference or tracking token in webhook metadata');
        }

        // Re-verify the payment server-side via the service (idempotent)
        await this.admissionsService.verifyPayment(trackingToken, reference);
        
        this.logger.log(`Paystack webhook handled successfully for reference: ${reference}`);
      } catch (error: any) {
        this.logger.error(`Error processing charge.success webhook: ${error.message}`, error.stack);
        // We still return 200 so Paystack stops retrying, unless it's a transient DB error.
        // For now, return 200 to acknowledge receipt.
      }
    }

    return res.status(HttpStatus.OK).send();
  }
}
