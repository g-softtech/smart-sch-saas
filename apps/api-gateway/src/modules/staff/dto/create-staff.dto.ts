import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { GenderEnum, StaffType } from "@saas/core-platform";

/** Ensures DOB is at least `minAgeYears` before the joiningDate on the same object */
@ValidatorConstraint({ name: "minAgeOnJoiningDate", async: false })
class MinAgeOnJoiningDateConstraint implements ValidatorConstraintInterface {
  validate(dateOfBirth: string, args: ValidationArguments) {
    if (!dateOfBirth) return true; // DOB is optional
    const obj = args.object as { joiningDate?: string };
    if (!obj.joiningDate) return true; // Let the @IsNotEmpty on joiningDate catch it
    const dob = new Date(dateOfBirth);
    const joining = new Date(obj.joiningDate);
    const minAge: number = args.constraints[0] as number;
    // DOB must be at least minAge years before joiningDate
    const minAgeDate = new Date(joining);
    minAgeDate.setFullYear(minAgeDate.getFullYear() - minAge);
    return dob <= minAgeDate;
  }

  defaultMessage(args: ValidationArguments) {
    const minAge: number = args.constraints[0] as number;
    return `Staff member must be at least ${minAge} years old on their joining date.`;
  }
}

function MinAgeOnJoiningDate(minAge: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      constraints: [minAge],
      validator: MinAgeOnJoiningDateConstraint,
    });
  };
}

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsDateString()
  @IsOptional()
  @MinAgeOnJoiningDate(18, {
    message: "Staff member must be at least 18 years old on their joining date.",
  })
  dateOfBirth?: string;

  @IsEnum(GenderEnum)
  @IsOptional()
  gender?: GenderEnum;

  @IsDateString()
  @IsNotEmpty()
  joiningDate: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsEnum(StaffType)
  @IsNotEmpty()
  type: StaffType;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsOptional()
  campusIds?: string[];
}
