const fs = require('fs');
const path = require('path');

const resultsPath = path.join('apps', 'api-gateway', 'src', 'modules', 'academics', 'services', 'results.service.ts');
const gradebookPath = path.join('apps', 'api-gateway', 'src', 'modules', 'academics', 'services', 'teacher-gradebook.service.ts');
const modulePath = path.join('apps', 'api-gateway', 'src', 'modules', 'academics', 'academics.module.ts');

// 1. Update ResultsService
let resultsCode = fs.readFileSync(resultsPath, 'utf8');

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

// Insert the method into ResultsService class body (after createGradingScale)
resultsCode = resultsCode.replace(
  /(async createGradingScale[^}]+}\s*})/s,
  `$1\n${resolverMethod}`
);

// Replace findUnique -> create in recordScore
const oldFindUniqueCreate = `      let subjectResult = await tx.subjectResult.findUnique({
        where: {
          tenantId_schoolId_enrollmentId_subjectId_termId: {
            tenantId,
            schoolId,
            enrollmentId: enrollment.id,
            subjectId: dto.subjectId,
            termId: dto.termId,
          },
        },
      });

      if (!subjectResult) {
        subjectResult = await tx.subjectResult.create({
          data: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            enrollmentId: enrollment.id,
            subjectId: dto.subjectId,
            status: ResultStatus.DRAFT,
          },
        });
      }`;

const newResolve = `      let subjectResult = await this.resolveOrCreateSubjectResult(tx, {
        tenantId,
        schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        enrollmentId: enrollment.id,
        subjectId: dto.subjectId,
      });`;

resultsCode = resultsCode.replace(oldFindUniqueCreate, newResolve);
fs.writeFileSync(resultsPath, resultsCode, 'utf8');

// 2. Update TeacherGradebookService
let gradebookCode = fs.readFileSync(gradebookPath, 'utf8');

// Inject ResultsService
gradebookCode = gradebookCode.replace(
  `import { TeacherAssignmentsService } from "./teacher-assignments.service";`,
  `import { TeacherAssignmentsService } from "./teacher-assignments.service";\nimport { ResultsService } from "./results.service";`
);

gradebookCode = gradebookCode.replace(
  `constructor(private readonly assignmentsService: TeacherAssignmentsService) {}`,
  `constructor(\n    private readonly assignmentsService: TeacherAssignmentsService,\n    private readonly resultsService: ResultsService\n  ) {}`
);

// Replace findFirst -> create in saveGradebookDraft
const oldFindFirstCreate = `          // Upsert SubjectResult
          let subjectResult = await tx.subjectResult.findFirst({
            where: {
              tenantId,
              schoolId,
              enrollmentId: enrollment.id,
              subjectId: dto.subjectId,
              termId: dto.termId,
            },
          });

          if (!subjectResult) {
            subjectResult = await tx.subjectResult.create({
              data: {
                tenantId,
                schoolId,
                academicYearId: dto.academicYearId,
                termId: dto.termId,
                enrollmentId: enrollment.id,
                subjectId: dto.subjectId,
                status: ResultStatus.DRAFT,
              },
            });
          }`;

const newGradebookResolve = `          // Safely Upsert SubjectResult
          let subjectResult = await this.resultsService.resolveOrCreateSubjectResult(tx, {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            enrollmentId: enrollment.id,
            subjectId: dto.subjectId,
          });`;

gradebookCode = gradebookCode.replace(oldFindFirstCreate, newGradebookResolve);
fs.writeFileSync(gradebookPath, gradebookCode, 'utf8');

console.log("Refactoring complete");
