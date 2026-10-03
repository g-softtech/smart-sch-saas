import { Controller, Post, Body, Req, UseGuards, Put, Param, Delete } from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { FleetService } from "../services/fleet.service";
import { CreateVehicleDto, UpdateVehicleDto } from "../dto/fleet.dto";
import { tenantContext } from "@saas/core-platform";

@Controller("api/v1/academics/transport/fleet")
@UseGuards(JwtAuthGuard)
export class AdminFleetController {
  constructor(private fleetService: FleetService) {}

  @Post()
  
  async createVehicle(@Req() req: any, @Body() dto: CreateVehicleDto) {
    const ctx = tenantContext.getStore();
    return this.fleetService.createVehicle(ctx!.tenantId, req.headers["x-school-id"], req.user.sub, dto);
  }

  @Put(":id")
  
  async updateVehicle(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    const ctx = tenantContext.getStore();
    return this.fleetService.updateVehicle(ctx!.tenantId, req.headers["x-school-id"], id, req.user.sub, dto);
  }

  @Delete(":id")
  
  async deleteVehicle(@Req() req: any, @Param("id") id: string) {
    const ctx = tenantContext.getStore();
    return this.fleetService.deleteVehicle(ctx!.tenantId, req.headers["x-school-id"], id, req.user.sub);
  }
}


