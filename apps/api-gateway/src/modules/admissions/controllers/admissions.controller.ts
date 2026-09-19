import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AdmissionsService, PublishFormDto, SubmitReviewDto } from '../services/admissions.service';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';

@Controller('api/v1/admissions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Post('forms/publish')
  async publishForm(@Body() body: PublishFormDto, @Req() req: any) {
    const authorizedSchoolId = req.workspace?.schoolId;

    if (!authorizedSchoolId) {
      throw new BadRequestException('A valid school workspace context is required to publish a form.');
    }

    if (body.schoolId && body.schoolId !== authorizedSchoolId) {
      throw new ForbiddenException('You are not authorized to publish a form for the requested school.');
    }

    const form = await this.service.publishForm({
      ...body,
      schoolId: authorizedSchoolId,
    });
    return { success: true, data: form };
  }

  @Get('applications')
  async listApplications() {
    const applications = await this.service.listApplications();
    return { success: true, data: applications };
  }

  @Get('applications/:id')
  async getApplication(@Param('id') id: string) {
    const application = await this.service.getApplication(id);
    return { success: true, data: application };
  }

  @Post('applications/:id/start-review')
  async startReview(@Param('id') id: string) {
    const result = await this.service.startReview(id);
    return { success: true, data: result };
  }

  @Post('applications/:id/reviews')
  async submitReview(@Param('id') id: string, @Body() body: SubmitReviewDto, @Req() req: any) {
    // Reviewer identity comes from the authenticated workspace context
    const reviewerId = req.user?.sub;
    if (!reviewerId) throw new Error('Unauthenticated');

    const result = await this.service.submitReview(id, reviewerId, body);
    return { success: true, data: result };
  }

  @Post('applications/:id/enroll')
  async enrollApplication(@Param('id') id: string) {
    const result = await this.service.enroll(id);
    return { success: true, data: result };
  }
}

