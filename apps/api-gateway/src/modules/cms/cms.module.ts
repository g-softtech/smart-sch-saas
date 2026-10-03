import { Module } from '@nestjs/common';
import { CmsAdminController } from './controllers/cms-admin.controller';
import { CmsPublicController } from './controllers/cms-public.controller';
import { CmsAdminService } from './services/cms-admin.service';
import { CmsPublicService } from './services/cms-public.service';
import { AuditService } from '@saas/core-platform';

@Module({
  controllers: [CmsAdminController, CmsPublicController],
  providers: [CmsAdminService, CmsPublicService, AuditService],
})
export class CmsModule {}