import { Module } from '@nestjs/common';
import { CmsAdminController } from './controllers/cms-admin.controller';
import { CmsPublicController } from './controllers/cms-public.controller';
import { CmsAdminService } from './services/cms-admin.service';
import { CmsPublicService } from './services/cms-public.service';
@Module({
  controllers: [CmsAdminController, CmsPublicController],
  providers: [CmsAdminService, CmsPublicService],
})
export class CmsModule {}