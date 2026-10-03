const fs = require("fs");
const files = [
  "apps/web-app/src/app/[schoolSlug]/layout.tsx",
  "apps/web-app/src/app/[schoolSlug]/page.tsx",
  "apps/web-app/src/app/dashboard/website/announcements/page.tsx",
  "apps/web-app/src/app/dashboard/website/navigation/page.tsx",
  "apps/web-app/src/app/dashboard/website/pages/page.tsx",
  "apps/web-app/src/app/dashboard/website/settings/page.tsx"
];
for(const f of files) {
  const p = "C:/Users/gbemi/OneDrive/Desktop/schoolOS/" + f;
  if(fs.existsSync(p)) {
    let text = fs.readFileSync(p, "utf-8");
    if(text.endsWith("\\n")) {
      fs.writeFileSync(p, text.substring(0, text.length - 2));
    }
  }
}
