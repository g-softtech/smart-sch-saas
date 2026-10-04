const fs = require("fs");

function fixFrontendFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  
  // Fix CTA links
  content = content.replace(/href=\{`\/admissions\/\$\{school\.id\}`\}/g, "href={`/admissions/${data.admissionsToken}`}");
  
  // Conditionally render CTA only if admissionsToken exists and config says enable
  content = content.replace(/\{config\.enableAdmissionsCta && \(/g, "{config.enableAdmissionsCta && data.admissionsToken && (");

  // Fix fallback colors
  content = content.replace(/"#0f172a"/g, '"#0A192E"');
  content = content.replace(/"#0d9488"/g, '"#039771"');
  content = content.replace(/"#fbbf24"/g, '"#D2AD36"');
  
  fs.writeFileSync(filePath, content);
  console.log("Fixed " + filePath);
}

fixFrontendFile("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/layout.tsx");
fixFrontendFile("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/page.tsx");

