import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { StudentCredentialService } from "../services/student-credential.service";
import {
  IssueStudentCredentialDto,
  RevokeStudentCredentialDto,
  StudentCredentialResponseDto,
  IssuedCredentialResponseDto,
  ScanCredentialDto,
} from "../dto/id-cards.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@ApiTags("ID Cards")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", required: true })
@ApiHeader({ name: "x-school-id", required: true })
@Controller(["api/v1/id-cards", "v1/id-cards"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class IdCardsController {
  constructor(private readonly idCardsService: StudentCredentialService) {}

  @Post("issue")
  @ApiOperation({ summary: "Issue a new QR ID Card credential for a student" })
  @ApiResponse({ status: 201, type: IssuedCredentialResponseDto })
  async issueCredential(@Req() req: any, @Body() dto: IssueStudentCredentialDto) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    const result = await this.idCardsService.issueCredential(tenantId, schoolId, dto.studentId);
    return IssuedCredentialResponseDto.fromEntityWithToken(result.credential, result.token);
  }

  @Patch(":id/revoke")
  @ApiOperation({ summary: "Revoke an ID Card credential" })
  @ApiResponse({ status: 200, type: StudentCredentialResponseDto })
  async revokeCredential(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: RevokeStudentCredentialDto
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    const credential = await this.idCardsService.revokeCredential(tenantId, schoolId, id, dto.reason);
    return StudentCredentialResponseDto.fromEntity(credential);
  }

  @Get("student/:studentId")
  @ApiOperation({ summary: "Get all credentials for a student" })
  @ApiResponse({ status: 200, type: [StudentCredentialResponseDto] })
  async getStudentCredentials(@Req() req: any, @Param("studentId") studentId: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    const credentials = await this.idCardsService.getCredentialsForStudent(tenantId, schoolId, studentId);
    return credentials.map((c) => StudentCredentialResponseDto.fromEntity(c));
  }

  @Post("scan")
  @ApiOperation({ summary: "Verify a scanned credential token" })
  @ApiResponse({ status: 200, description: "Credential successfully verified" })
  async scanCredential(@Req() req: any, @Body() dto: ScanCredentialDto) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;
    if (!schoolId) throw new BadRequestException("School context is required");

    // Normalize safely (trim whitespace/CRLF common in HID scanners)
    const normalizedToken = dto.token.trim();
    if (normalizedToken.length === 0) {
      throw new BadRequestException("Credential could not be verified");
    }

    return this.idCardsService.verifyCredential(tenantId, schoolId, operatorId, normalizedToken, dto.source);
  }
}
