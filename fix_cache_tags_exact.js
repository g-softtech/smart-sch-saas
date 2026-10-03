const fs = require("fs");

let layout = fs.readFileSync("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/layout.tsx", "utf-8");
layout = layout.replace(
  /fetch\(\`\$\{apiUrl\}\/v1\/public\/cms\/\$\{slug\}\/resolve\`.*?\)/,
  `fetch(\`\${apiUrl}/v1/public/cms/\${slug}/resolve\`, { next: { revalidate: 60, tags: [\`school-slug-\${slug}\`] } })`
);
layout = layout.replace(
  /fetch\(\`\$\{apiUrl\}\/v1\/public\/cms\/\$\{slug\}\/navigation\`.*?\)/,
  `fetch(\`\${apiUrl}/v1/public/cms/\${slug}/navigation\`, { next: { revalidate: 60, tags: [\`cms-site-\${data.school.tenantId}-\${data.school.id}\`] } })`
);
fs.writeFileSync("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/layout.tsx", layout);

let page = fs.readFileSync("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/page.tsx", "utf-8");
page = page.replace(
  /fetch\(\`\$\{apiUrl\}\/v1\/public\/cms\/\$\{slug\}\/resolve\`.*?\)/,
  `fetch(\`\${apiUrl}/v1/public/cms/\${slug}/resolve\`, { next: { revalidate: 60, tags: [\`school-slug-\${slug}\`] } })`
);
page = page.replace(
  /fetch\(\`\$\{apiUrl\}\/v1\/public\/cms\/\$\{slug\}\/pages\/home\`.*?\)/,
  `fetch(\`\${apiUrl}/v1/public/cms/\${slug}/pages/home\`, { next: { revalidate: 60, tags: [\`school-slug-\${slug}\`] } })`
);
page = page.replace(
  /fetch\(\`\$\{apiUrl\}\/v1\/public\/cms\/\$\{slug\}\/announcements\`.*?\)/,
  `fetch(\`\${apiUrl}/v1/public/cms/\${slug}/announcements\`, { next: { revalidate: 60, tags: [\`school-slug-\${slug}\`] } })`
);
fs.writeFileSync("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/page.tsx", page);

console.log("Updated cache tags explicitly");
