import { Controller, NotImplementedException, All } from "@nestjs/common";

@Controller(["api/v1/cbt", "v1/cbt"])
export class CBTController {
  @All()
  all() {
    throw new NotImplementedException("Phase 6C rebuild pending");
  }
}
