import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";

@Controller("health")
export class AppController {
  @Get("liveness")
  @HttpCode(HttpStatus.OK)
  checkLiveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("readiness")
  @HttpCode(HttpStatus.OK)
  checkReadiness() {
    return { status: "ready", timestamp: new Date().toISOString() };
  }
}
