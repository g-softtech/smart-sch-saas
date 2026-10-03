const fs = require('fs');
const path = require('path');

const gradebookPath = path.join('apps', 'api-gateway', 'src', 'modules', 'academics', 'services', 'teacher-gradebook.service.ts');
let gradebookCode = fs.readFileSync(gradebookPath, 'utf8');

gradebookCode = gradebookCode.replace(
  `}); else if (subjectResult.status === ResultStatus.PUBLISHED || subjectResult.status === ResultStatus.FINALIZED) {`,
  `});\n\n          if (subjectResult.status === ResultStatus.PUBLISHED || subjectResult.status === ResultStatus.FINALIZED) {`
);

fs.writeFileSync(gradebookPath, gradebookCode, 'utf8');

console.log("Syntax fixed");
