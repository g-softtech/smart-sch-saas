-- Create partial unique index on idm_user_school_access for FULL_SCHOOL access (campusId is NULL)
CREATE UNIQUE INDEX "idm_user_school_access_userId_schoolId_null_campusId_key" 
ON "idm_user_school_access"("userId", "schoolId") 
WHERE "campusId" IS NULL;
