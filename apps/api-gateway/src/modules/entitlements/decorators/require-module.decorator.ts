import { SetMetadata } from "@nestjs/common";
import { ModuleKey } from "@saas/core-platform";

export const MODULE_KEY = "module_key";
export const RequireModule = (moduleKey: ModuleKey) => SetMetadata(MODULE_KEY, moduleKey);
