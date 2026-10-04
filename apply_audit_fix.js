const fs = require("fs");

function removeAuditProvider(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  if (content.includes("AuditService")) {
    content = content.replace(/,\s*AuditService/g, "");
    content = content.replace(/AuditService\s*,/g, "");
    content = content.replace(/\[\s*AuditService\s*\]/g, "[]");
    content = content.replace(/import\s*\{\s*AuditService\s*\}\s*from\s*['"]@saas\/core-platform['"];?\s*/g, "");
    fs.writeFileSync(filePath, content);
    console.log("Removed AuditService provider from " + filePath);
  }
}

removeAuditProvider("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/api-gateway/src/modules/cms/cms.module.ts");

// Add AuditModule to AppModule
let appPath = "C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/api-gateway/src/app.module.ts";
let appContent = fs.readFileSync(appPath, "utf-8");
if (!appContent.includes("AuditModule")) {
  appContent = "import { AuditModule } from './modules/audit/audit.module';\n" + appContent;
  appContent = appContent.replace("imports: [", "imports: [\n    AuditModule,");
  fs.writeFileSync(appPath, appContent);
  console.log("Added AuditModule to AppModule");
}
