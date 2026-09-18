import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticationService } from '../services/authentication.service';
import { JwtAuthGuard } from '../security/jwt-auth.guard';

@ApiTags('Identity')
@Controller('api/v1/identity/me')
export class IdentityController {
  constructor(private readonly authService: AuthenticationService) {}

  @Get('workspaces')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Discover user workspaces (schools and campuses)' })
  @ApiResponse({ status: 200 })
  async getWorkspaces(@Req() req: any) {
    const workspaces = await this.authService.getWorkspaces(req.user.sub);
    return {
      success: true,
      data: workspaces
    };
  }
}
