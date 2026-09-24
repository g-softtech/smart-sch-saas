-- Create a partial unique index for Arrival idempotency when campusId is NULL
CREATE UNIQUE INDEX "StudentArrival_tenantId_schoolId_studentId_operational_null_key"
ON "StudentArrival"("tenantId", "schoolId", "studentId", "operationalDate")
WHERE "campusId" IS NULL;
