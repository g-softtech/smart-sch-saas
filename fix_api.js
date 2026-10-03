const fs = require("fs");

let appModule = fs.readFileSync("apps/api-gateway/src/app.module.ts", "utf-8");
if (!appModule.includes("import { CmsModule }")) {
  appModule = appModule.replace(
    `import { LibraryModule } from "./modules/library/library.module";`,
    `import { LibraryModule } from "./modules/library/library.module";\nimport { CmsModule } from "./modules/cms/cms.module";`
  );
  fs.writeFileSync("apps/api-gateway/src/app.module.ts", appModule);
}

let cmsAdmin = fs.readFileSync("apps/api-gateway/src/modules/cms/controllers/cms-admin.controller.ts", "utf-8");
cmsAdmin = cmsAdmin.replace(
  `import { PoliciesGuard, RequirePermissions } from '../../identity/security/policies.guard';`,
  ``
);
cmsAdmin = cmsAdmin.replace(
  `import { TenantContextGuard } from '../../identity/security/tenant-context.guard';`,
  `import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';\nimport { UseInterceptors } from '@nestjs/common';`
);
cmsAdmin = cmsAdmin.replace(
  `@UseGuards(JwtAuthGuard, TenantContextGuard, PoliciesGuard)`,
  `@UseGuards(JwtAuthGuard)\n@UseInterceptors(WorkspaceContextInterceptor)`
);
cmsAdmin = cmsAdmin.replace(/req\.tenantContext\.tenantId/g, `req.workspace.tenantId`);
cmsAdmin = cmsAdmin.replace(/req\.tenantContext\.schoolId/g, `req.workspace.schoolId`);
cmsAdmin = cmsAdmin.replace(/@RequirePermissions\('[^']+'\)/g, ``);
fs.writeFileSync("apps/api-gateway/src/modules/cms/controllers/cms-admin.controller.ts", cmsAdmin);
console.log("Fixed API Gateway");
