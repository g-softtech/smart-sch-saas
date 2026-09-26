import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SubmitStudentAssignmentDto {
  @IsString()
  @IsNotEmpty()
  textContent: string;
}

export class CBTAnswerInputDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsNumber()
  selectedOption: number;
}

export class SubmitStudentCBTDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CBTAnswerInputDto)
  answers: CBTAnswerInputDto[];
}
