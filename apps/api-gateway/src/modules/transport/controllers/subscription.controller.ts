import { Controller, Post, Body, Req, UseGuards, Param, Patch } from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { SubscriptionService } from "../services/subscription.service";
import { CreateSubscriptionDto } from "../dto/subscription.dto";
import { tenantContext } from "@saas/core-platform";

@Controller("api/v1/academics/transport/subscriptions")
@UseGuards(JwtAuthGuard)
export class AdminTransportSubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Post()
  
  async createSubscription(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    const ctx = tenantContext.getStore();
    return this.subscriptionService.createSubscription(ctx!.tenantId, req.headers["x-school-id"], req.user.sub, dto);
  }

  @Patch(":id/cancel")
  
  async cancelSubscription(@Req() req: any, @Param("id") id: string) {
    const ctx = tenantContext.getStore();
    return this.subscriptionService.cancelSubscription(ctx!.tenantId, req.headers["x-school-id"], id, req.user.sub);
  }
}


