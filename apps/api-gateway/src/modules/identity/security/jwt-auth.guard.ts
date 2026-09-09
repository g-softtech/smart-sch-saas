import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token);
      
      // Preserve strictly { sub: user.id } compatibility.
      // We explicitly map the payload to ensure we do not trust any arbitrary payload fields,
      // and we never accept a client-provided user ID from query/header.
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      (request as any).user = {
        sub: payload.sub,
      };
      
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
    
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
