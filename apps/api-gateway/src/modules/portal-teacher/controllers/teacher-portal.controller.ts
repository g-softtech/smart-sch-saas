import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { TeacherPortalService } from "../services/teacher-portal.service";
import { UpdateTeacherProfileDto } from "../dto/teacher-portal.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@ApiTags("Teacher Portal BFF")
@Controller("api/v1/portal/teacher")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class TeacherPortalController {
  constructor(private readonly teacherPortalService: TeacherPortalService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get aggregated dashboard summary for authenticated teacher" })
  async getDashboard(@Req() req: any) {
    const userId = req.user.sub;
    return this.teacherPortalService.getDashboard(userId);
  }

  @Get("profile")
  @ApiOperation({ summary: "Get profile info for authenticated teacher" })
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.teacherPortalService.getProfile(userId);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update self-service profile info for authenticated teacher" })
  async updateProfile(@Req() req: any, @Body() dto: UpdateTeacherProfileDto) {
    const userId = req.user.sub;
    return this.teacherPortalService.updateProfile(userId, dto);
  }

  @Post("profile/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload self-service avatar profile photo for authenticated teacher" })
  async uploadPhoto(
    @Req() req: any,
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
    const userId = req.user.sub;
    return this.teacherPortalService.uploadPhoto(userId, file);
  }

  @Get("profile/photo")
  @ApiOperation({ summary: "Get avatar profile photo stream for authenticated teacher" })
  async getPhoto(@Req() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const photo = await this.teacherPortalService.getPhoto(userId);
    if (!photo) {
      throw new NotFoundException("Profile photo not found");
    }

    res.set({
      "Content-Type": photo.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    });

    res.send(photo.data);
  }

  @Delete("profile/photo")
  @ApiOperation({ summary: "Delete avatar profile photo for authenticated teacher" })
  async deletePhoto(@Req() req: any) {
    const userId = req.user.sub;
    return this.teacherPortalService.deletePhoto(userId);
  }

  @Get("timetable")
  @ApiOperation({ summary: "Get weekly timetable entries for authenticated teacher" })
  async getTimetable(@Req() req: any) {
    const userId = req.user.sub;
    return this.teacherPortalService.getTimetable(userId);
  }

  @Get("classes")
  @ApiOperation({ summary: "Get assigned classes and arms for authenticated teacher" })
  async getClasses(@Req() req: any) {
    const userId = req.user.sub;
    return this.teacherPortalService.getClasses(userId);
  }

  @Get("classes/:classId/students")
  @ApiOperation({ summary: "Get student roster for assigned class/arm" })
  async getStudentsForClass(
    @Req() req: any,
    @Param("classId") classId: string,
    @Query("armId") armId?: string,
  ) {
    const userId = req.user.sub;
    return this.teacherPortalService.getStudentsForClass(userId, classId, armId);
  }
}
