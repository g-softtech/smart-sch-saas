const fs = require('fs');
const path = require('path');

const resultsPath = path.join('apps', 'api-gateway', 'src', 'modules', 'academics', 'services', 'results.service.ts');
let resultsCode = fs.readFileSync(resultsPath, 'utf8');

// The injected code string to look for and remove
const injectedCodePattern = /\s*async resolveOrCreateSubjectResult\([\s\S]*?update: \{\}\s*\}\);\s*\}/;
resultsCode = resultsCode.replace(injectedCodePattern, '');

const resolverMethod = `
  async resolveOrCreateSubjectResult(
    tx: any,
    params: {
      tenantId: string;
      schoolId: string;
      academicYearId: string;
      termId: string;
      enrollmentId: string;
      subjectId: string;
    }
  ) {
    return tx.subjectResult.upsert({
      where: {
        tenantId_schoolId_enrollmentId_subjectId_termId: {
          tenantId: params.tenantId,
          schoolId: params.schoolId,
          enrollmentId: params.enrollmentId,
          subjectId: params.subjectId,
          termId: params.termId,
        }
      },
      update: {},
      create: {
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        termId: params.termId,
        enrollmentId: params.enrollmentId,
        subjectId: params.subjectId,
        status: ResultStatus.DRAFT,
      },
    });
  }
`;

resultsCode = resultsCode.replace(/}\s*$/, resolverMethod + "\n}\n");
fs.writeFileSync(resultsPath, resultsCode, 'utf8');

const specPath = path.join('apps', 'api-gateway', 'test', 'results-resolver.e2e-spec.ts');
let specCode = fs.readFileSync(specPath, 'utf8');

// Fix dummy data
specCode = specCode.replace(
  `const school = await kernel.db.school.create({ data: { tenantId, name: "Resolver School", abbreviation: "RS" } });`,
  `const school = await kernel.db.school.create({ data: { tenantId, name: "Resolver School" } });`
);

specCode = specCode.replace(
  `const otherSchool = await kernel.db.school.create({ data: { tenantId: otherTenantId, name: "Other School", abbreviation: "OS" } });`,
  `const otherSchool = await kernel.db.school.create({ data: { tenantId: otherTenantId, name: "Other School" } });`
);

specCode = specCode.replace(
  `const subject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Math", code: "MTH" } });`,
  `const subject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Math" } });`
);

specCode = specCode.replace(
  `const newSubject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Science", code: "SCI" } });`,
  `const newSubject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Science" } });`
);

specCode = specCode.replace(
  /const student = await kernel\.db\.student\.create\(\{ data: \{ tenantId, schoolId, userId: "u_" \+ uniqueSuffix, firstName: "John", lastName: "Doe", dateOfBirth: new Date\(\) \} \}\);/,
  `const student = await kernel.db.student.create({ data: { tenantId, schoolId, userId: "u_" + uniqueSuffix, firstName: "John", lastName: "Doe", studentNumber: "STD-"+uniqueSuffix } });`
);

specCode = specCode.replace(
  /const newStudent = await kernel\.db\.student\.create\(\{ data: \{ tenantId, schoolId, userId: "ux_" \+ Date\.now\(\), firstName: "Jane", lastName: "Doe", dateOfBirth: new Date\(\) \} \}\);/,
  `const newStudent = await kernel.db.student.create({ data: { tenantId, schoolId, userId: "ux_" + Date.now(), firstName: "Jane", lastName: "Doe", studentNumber: "STD-X-"+Date.now() } });`
);

fs.writeFileSync(specPath, specCode, 'utf8');
