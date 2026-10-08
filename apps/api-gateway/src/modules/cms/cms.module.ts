import { Module } from '@nestjs/common';
import { CmsAdminController } from './controllers/cms-admin.controller';
import { CmsPublicController } from './controllers/cms-public.controller';
import { CmsBuilderController } from './controllers/cms-builder.controller';
import { CmsAdminService } from './services/cms-admin.service';
import { CmsPublicService } from './services/cms-public.service';
import { CmsBuilderService } from './services/cms-builder.service';

@Module({
  controllers: [CmsAdminController, CmsPublicController, CmsBuilderController],
  providers: [CmsAdminService, CmsPublicService, CmsBuilderService],
})
export class CmsModule {}