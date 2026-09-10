export class CreateCampusDto {
  schoolId!: string;
  name!: string;
}

export class CreateAcademicYearDto {
  schoolId!: string;
  name!: string;
}

export class CreateTermDto {
  academicYearId!: string;
  name!: string;
}

export class CreateDepartmentDto {
  schoolId!: string;
  name!: string;
}

export class CreateClassDto {
  schoolId!: string;
  name!: string;
}

export class CreateArmDto {
  classId!: string;
  campusId!: string;
  name!: string;
}

export class CreateSubjectGroupDto {
  schoolId!: string;
  name!: string;
}

export class CreateSubjectDto {
  schoolId!: string;
  name!: string;
  subjectGroupId?: string;
}
