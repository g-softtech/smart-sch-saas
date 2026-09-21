import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsBoolean, IsNumber, IsIn, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, Validate, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { AdmissionReviewDecision, GenderEnum } from '@saas/core-platform';

export class FieldSchemaDto {
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'date', 'file', 'select'])
  type: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @IsOptional()
  @IsNumber()
  minLength?: number;
}

@ValidatorConstraint({ name: 'isFieldSchemaRecord', async: false })
export class IsFieldSchemaRecordConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const allowedFieldSchemaKeys = ['type', 'required', 'label', 'options', 'maxLength', 'minLength'];

    for (const [key, field] of Object.entries(value)) {
      if (typeof field !== 'object' || field === null) return false;
      
      const { type, required, label, options, maxLength, minLength, ...rest } = field as any;
      
      // Reject unknown properties
      if (Object.keys(rest).length > 0) return false;

      // Validate type
      if (!['string', 'number', 'boolean', 'date', 'file', 'select'].includes(type)) {
        return false;
      }

      // Validate required and label
      if (required !== undefined && typeof required !== 'boolean') return false;
      if (label !== undefined && typeof label !== 'string') return false;

      // Validate options
      if (options !== undefined) {
        if (!Array.isArray(options)) return false;
        if (!options.every(o => typeof o === 'string')) return false;
      }

      // Validate maxLength and minLength
      if (maxLength !== undefined && typeof maxLength !== 'number') return false;
      if (minLength !== undefined && typeof minLength !== 'number') return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'fieldsSchema must be a valid record of field definitions, containing only supported properties (type, required, label, options, maxLength, minLength) and correct types.';
  }
}

export class WorkflowStageDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class PublishFormDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  targetClassId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @Validate(IsFieldSchemaRecordConstraint)
  fieldsSchema: Record<string, FieldSchemaDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  workflowStages: WorkflowStageDto[];
}

export class ApplicantDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(Object.values(GenderEnum))
  gender?: GenderEnum;
}

export class SubmitApplicationDto {
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant: ApplicantDto;

  // formData is dynamic, validated by FormValidator at runtime
  @IsOptional()
  formData?: any;
}

export class SubmitReviewDto {
  @IsIn(Object.values(AdmissionReviewDecision))
  decision: AdmissionReviewDecision;

  @IsOptional()
  @IsString()
  comments?: string;
}
