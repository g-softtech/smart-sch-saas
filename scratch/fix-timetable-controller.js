const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../apps/api-gateway/src/modules/academics/controllers/timetable.controller.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

// Add imports
content = content.replace('Get,', 'Get,\n  Patch,\n  Delete,');
content = content.replace('} from "@nestjs/common";', '} from "@nestjs/common";\nimport { RequirePermission } from "../../identity/security/require-permission.decorator";');
content = content.replace('CreateTimetableEntryDto } from "../dto/timetable.dto";', 'CreateTimetableEntryDto, UpdateTimetablePeriodDto, UpdateTimetableEntryDto } from "../dto/timetable.dto";');

// Add RequirePermission to existing
content = content.replace('@Post("periods")', '@Post("periods")\n  @RequirePermission("academics:manage_timetable")');
content = content.replace('@Get("periods/:academicYearId")', '@Get("periods/:academicYearId")\n  @RequirePermission("academics:read_timetable")');
content = content.replace('@Post("entries")', '@Post("entries")\n  @RequirePermission("academics:manage_timetable")');
content = content.replace('@Get("class/:academicYearId/:termId/:classId")', '@Get("class/:academicYearId/:termId/:classId")\n  @RequirePermission("academics:read_timetable")');
content = content.replace('@Get("teacher/:academicYearId/:termId/:teacherId")', '@Get("teacher/:academicYearId/:termId/:teacherId")\n  @RequirePermission("academics:read_timetable")');

const additionalMethods = `
  @Patch("periods/:id")
  @RequirePermission("academics:manage_timetable")
  async updatePeriod(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
    @Body() dto: UpdateTimetablePeriodDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.updatePeriod(tenantId, schoolId, id, dto);
  }

  @Delete("periods/:id")
  @RequirePermission("academics:manage_timetable")
  async deletePeriod(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.deletePeriod(tenantId, schoolId, id);
  }

  @Patch("entries/:id")
  @RequirePermission("academics:manage_timetable")
  async updateEntry(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
    @Body() dto: UpdateTimetableEntryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.updateEntry(tenantId, schoolId, id, dto);
  }

  @Delete("entries/:id")
  @RequirePermission("academics:manage_timetable")
  async deleteEntry(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.deleteEntry(tenantId, schoolId, id);
  }
}
`;

content = content.replace('}\r\n', additionalMethods);
if (!content.includes('updatePeriod')) {
    content = content.replace('}\n', additionalMethods);
}
fs.writeFileSync(controllerPath, content);
