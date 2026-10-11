import { IsString, IsNotEmpty } from "class-validator";

export class IssueCredentialDto {
  @IsString()
  @IsNotEmpty()
  type: string;
}
