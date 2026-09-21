import { IsEnum, IsNotEmpty } from "class-validator";
import { CredentialType } from "@saas/core-platform";

export class IssueCredentialDto {
  @IsEnum(CredentialType)
  @IsNotEmpty()
  type: CredentialType;
}
