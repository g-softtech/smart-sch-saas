import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AdmissionsService, SubmitApplicationDto } from '../services/admissions.service';

@Controller('public/admissions')
export class PublicAdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Get('forms/:publicToken')
  async getForm(@Param('publicToken') publicToken: string) {
    const form = await this.service.getFormByPublicToken(publicToken);
    
    // Explicitly construct safe payload for unauthenticated public
    // Stripping internal IDs where not necessary, though UUIDs are safe, 
    // it's best practice not to expose everything.
    return {
      success: true,
      data: {
        title: form.title,
        fieldsSchema: form.fieldsSchema,
        academicYear: form.academicYear?.name,
        targetClass: form.targetClass?.name,
      }
    };
  }

  @Post('applications/:publicToken')
  async submitApplication(
    @Param('publicToken') publicToken: string,
    @Body() body: SubmitApplicationDto
  ) {
    const application = await this.service.submitApplication(publicToken, body);
    
    // Return tracking token to applicant
    return { 
      success: true, 
      data: { 
        id: application.id, 
        trackingToken: application.trackingToken 
      } 
    };
  }
}
