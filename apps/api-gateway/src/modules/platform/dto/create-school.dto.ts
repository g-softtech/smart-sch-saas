import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  schoolName: string;
}
