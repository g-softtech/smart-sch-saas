import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthenticationService } from "../services/authentication.service";
import { RegistrationService } from "../services/registration.service";
import { RegisterUserDto, LoginDto, ApiResponseDto } from "../dto/auth.dto";
import { JwtAuthGuard } from "../security/jwt-auth.guard";

@ApiTags("Authentication")
@Controller("api/v1/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly registrationService: RegistrationService,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new global user account" })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  async register(
    @Body() dto: RegisterUserDto,
  ): Promise<ApiResponseDto<{ accessToken: string }>> {
    const result = await this.registrationService.register(dto);
    return {
      success: true,
      data: { accessToken: result.accessToken },
    };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Authenticate and receive a JWT" })
  @ApiResponse({ status: 200, description: "Successfully authenticated" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: LoginDto,
  ): Promise<ApiResponseDto<{ accessToken: string }>> {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: { accessToken: result.accessToken },
    };
  }

  @Get("workspaces")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Discover user workspaces" })
  @ApiResponse({ status: 200 })
  async getWorkspaces(@Req() req: any) {
    const workspaces = await this.authService.getWorkspaces(req.user.sub);
    return {
      success: true,
      data: workspaces,
    };
  }
}
