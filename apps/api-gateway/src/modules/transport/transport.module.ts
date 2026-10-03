import { Module } from "@nestjs/common";
import { AdminFleetController } from "./controllers/fleet.controller";
import { AdminRouteController } from "./controllers/route.controller";
import { AdminTransportSubscriptionController } from "./controllers/subscription.controller";
import { FleetService } from "./services/fleet.service";
import { RouteService } from "./services/route.service";
import { SubscriptionService } from "./services/subscription.service";

@Module({
  controllers: [AdminFleetController, AdminRouteController, AdminTransportSubscriptionController],
  providers: [FleetService, RouteService, SubscriptionService],
})
export class TransportModule {}
