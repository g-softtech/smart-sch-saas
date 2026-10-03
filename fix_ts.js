const fs = require('fs');
const path = require('path');
const specPath = path.join('apps', 'api-gateway', 'src', 'modules', 'cbt', 'services', 'cbt-compiler.service.spec.ts');
let specData = fs.readFileSync(specPath, 'utf8');

specData = specData.replace(
  /\{ hasAuthority: false \}/g,
  '{ hasAuthority: false, isPrimary: false, reason: "Unauthorized" } as any'
);

specData = specData.replace(
  /\{ hasAuthority: true \}/g,
  '{ hasAuthority: true, isPrimary: true, scope: "CLASS_WIDE" as any, assignmentId: "a1" }'
);

fs.writeFileSync(specPath, specData, 'utf8');
