import { Controller, Get, UseGuards } from "@nestjs/common";
import { PlatformAuthGuard } from "../../identity/security/platform-auth.guard";

@Controller("api/v1/platform")
@UseGuards(PlatformAuthGuard)
export class PlatformController {
  
  @Get("health")
  getHealth() {
    return { status: "ok", boundary: "platform-super-admin" };
  }
}
