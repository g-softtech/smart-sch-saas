const fs = require("fs");
const path = "C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/api-gateway/src/modules/cms/services/cms-public.service.ts";
let content = fs.readFileSync(path, "utf-8");

if (!content.includes("activeAdmissionForm")) {
  content = content.replace(
    "return { school, config };", 
    `
    // Fetch canonical active admission form
    const activeAdmissionForm = await this.rawPrisma.publishedAdmissionForm.findFirst({
      where: { schoolId: school.id, tenantId: school.tenantId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    return { school, config, admissionsToken: activeAdmissionForm?.publicToken || null };
    `
  );
  fs.writeFileSync(path, content);
  console.log("Updated cms-public.service.ts");
}
