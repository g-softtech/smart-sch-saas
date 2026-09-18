import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@saas/core-platform';

@Catch(Prisma.PrismaClientKnownRequestError)
export class AcademicsPrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Unique constraint failed
    if (exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'A record with these details already exists in this context.';
    }
    // Foreign key constraint failed
    else if (exception.code === 'P2003') {
      status = HttpStatus.CONFLICT;
      message = 'Cannot delete or modify entity because it is currently in use.';
    }
    // Record to update not found
    else if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found.';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
