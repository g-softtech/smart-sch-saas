const fs = require('fs');
let content = fs.readFileSync('test/students.e2e-spec.ts', 'utf8');

content = content.replace(/\.set\('x-tenant-id', TENANT_ID\)/g, '.set(\'x-tenant-id\', TENANT_ID)\n        .set(\'x-school-id\', SCHOOL_ID)');

const testInsertStr = \
    it('POST /api/v1/students — rejects dateOfBirth equal to admissionDate (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', \\\Bearer \\\\\\)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', SCHOOL_ID)
        .send({ ...validCreateStudentBody, dateOfBirth: '2026-09-01', admissionDate: '2026-09-01' })
        .expect(400);
    });

    it('POST /api/v1/students — rejects dateOfBirth after admissionDate (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', \\\Bearer \\\\\\)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', SCHOOL_ID)
        .send({ ...validCreateStudentBody, dateOfBirth: '2026-09-10', admissionDate: '2026-09-01' })
        .expect(400);
    });
\;

content = content.replace(
  \    it('POST /api/v1/students/:id/enrollments — rejects non-UUID academicYearId (400)', async () => {\,
  testInsertStr + \\n    it('POST /api/v1/students/:id/enrollments — rejects non-UUID academicYearId (400)', async () => {\
);

fs.writeFileSync('test/students.e2e-spec.ts', content);
