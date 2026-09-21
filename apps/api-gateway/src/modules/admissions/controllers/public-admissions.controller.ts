import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { AdmissionsService } from "../services/admissions.service";
import { SubmitApplicationDto } from "../dto/admissions.dto";

@Controller("public/admissions")
export class PublicAdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Get("forms/:publicToken")
  async getForm(@Param("publicToken") publicToken: string) {
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
        applicationFee: form.applicationFee,
        currency: form.currency,
      },
    };
  }

  @Post("applications/:publicToken")
  async submitApplication(
    @Param("publicToken") publicToken: string,
    @Body() body: SubmitApplicationDto,
  ) {
    const result = await this.service.submitApplication(publicToken, body);

    // Return tracking token to applicant, and payment info if applicable
    return {
      success: true,
      data: {
        id: result.application.id,
        trackingToken: result.application.trackingToken,
        status: result.application.status,
        payment: result.payment,
      },
    };
  }

  @Post("payments/verify")
  async verifyPayment(
    @Body('trackingToken') trackingToken: string,
    @Body('reference') reference: string,
  ) {
    const result = await this.service.verifyPayment(trackingToken, reference);
    return {
      success: true,
      data: {
        status: result.application.status,
      },
    };
  }
}
