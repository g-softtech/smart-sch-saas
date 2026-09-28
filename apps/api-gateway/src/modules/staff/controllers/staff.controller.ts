import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { StaffService } from "../services/staff.service";
import { CreateStaffDto } from "../dto/create-staff.dto";
import { UpdateStaffDto } from "../dto/update-staff.dto";
import { UpdateStaffStatusDto } from "../dto/update-staff-status.dto";
import { IssueCredentialDto } from "../dto/issue-credential.dto";
import { StaffResponseDto } from "../dto/staff-response.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@Controller(["api/v1/staff", "v1/staff"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    const { tenantId, schoolId, campusId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    if (campusId && (!dto.campusIds || dto.campusIds.length === 0)) {
      dto.campusIds = [campusId];
    }

    const staff = await this.staffService.createStaff(tenantId, schoolId, dto);
    return StaffResponseDto.fromEntity(staff);
  }

  @Get()
  async listStaff(
    @Req() req: any,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("search") search?: string,
  ) {
    const { tenantId, schoolId, campusId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    const parsedTake = take ? parseInt(take, 10) : 50;

    const list = await this.staffService.listStaff(
      tenantId,
      schoolId,
      campusId,
      parsedSkip,
      parsedTake,
      search
    );
    return list.map((staff) => StaffResponseDto.fromEntity(staff));
  }

  @Get(":id")
  async getStaff(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const staff = await this.staffService.getStaff(tenantId, schoolId, id);
    return StaffResponseDto.fromEntity(staff);
  }

  @Patch(":id")
  async updateStaff(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const updated = await this.staffService.updateStaff(tenantId, schoolId, id, dto);
    return StaffResponseDto.fromEntity(updated);
  }

  @Post(":id/status")
  async updateStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateStaffStatusDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const staff = await this.staffService.updateStaffStatus(
      tenantId,
      schoolId,
      id,
      dto.targetStatus,
    );
    return StaffResponseDto.fromEntity(staff);
  }

  // ─── Staff Photo Avatar Endpoints ─────────────────────────────────────────

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  async uploadStaffPhoto(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: ".(png|jpeg|jpg|webp)" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const { schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    const photoInfo = await this.staffService.uploadStaffPhoto(id, file, schoolId);
    return { success: true, data: photoInfo };
  }

  @Get(":id/photo")
  async getStaffPhoto(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const photo = await this.staffService.getStaffPhoto(id);
    if (!photo) {
      throw new NotFoundException("Staff photo not found");
    }

    res.set({
      "Content-Type": photo.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    });

    res.send(photo.data);
  }

  @Delete(":id/photo")
  async deleteStaffPhoto(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    await this.staffService.deleteStaffPhoto(id, schoolId);
    return { success: true, message: "Staff photo deleted successfully" };
  }

  // ─── Credentials ──────────────────────────────────────────────────────────

  @Post(":id/credentials")
  async issueCredential(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: IssueCredentialDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    return this.staffService.issueCredential(tenantId, schoolId, id, dto);
  }

  @Post("credentials/verify")
  async verifyCredential(@Req() req: any, @Body() body: { rawToken: string }) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    if (!body.rawToken) throw new BadRequestException("rawToken is required");
    return this.staffService.verifyCredential(
      tenantId,
      schoolId,
      body.rawToken,
    );
  }
}
