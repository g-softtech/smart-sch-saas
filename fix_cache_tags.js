const fs = require("fs");

function fixFetch(file) {
  let content = fs.readFileSync(file, "utf-8");
  // Replace `{ next: { revalidate: 60 } }` with tags
  content = content.replace(
    /\{ next: \{ revalidate: 60 \} \}/g,
    `{ next: { revalidate: 60, tags: [\`cms-site-\${slug}\`] } }`
  );
  fs.writeFileSync(file, content);
}

fixFetch("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/layout.tsx");
fixFetch("C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/[schoolSlug]/page.tsx");
console.log("Updated tags in fetches");
