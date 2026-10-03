const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf-8");
    content = content.replace(/"\$"\{"/g, "${");
    content = content.replace(/"\}/g, "}");
    content = content.replace(/`"\$"/g, "`$");
    content = content.replace(/`"/g, "`");
    fs.writeFileSync(filePath, content);
    console.log("Fixed " + filePath);
  }
}

fixFile("apps/web-app/src/app/dashboard/website/settings/page.tsx");
fixFile("apps/web-app/src/app/dashboard/website/pages/page.tsx");
fixFile("apps/web-app/src/app/dashboard/website/announcements/page.tsx");
fixFile("apps/web-app/src/app/dashboard/website/navigation/page.tsx");
fixFile("apps/web-app/src/app/[schoolSlug]/layout.tsx");
fixFile("apps/web-app/src/app/[schoolSlug]/page.tsx");

