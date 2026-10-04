const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const s = await p.school.findFirst({ select: { publicSlug: true } });
  console.log("School: " + (s ? s.publicSlug : "None"));
  
  if (s) {
    const http = require("http");
    http.get(`http://localhost:3000/${s.publicSlug}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => console.log(`HTTP ${res.statusCode} - Data length: ${data.length}`));
    });
  }
}
run().finally(() => p.$disconnect());
