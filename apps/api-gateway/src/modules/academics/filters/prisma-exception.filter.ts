import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from "@nestjs/common";

@Catch()
export class AcademicsPrismaExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Pass through standard HttpExceptions (e.g. BadRequestException, NotFoundException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response
        .status(status)
        .json(
          typeof res === "object" ? res : { message: res, statusCode: status },
        );
    }

    // Handle Prisma errors robustly bypassing instanceof (monorepo hoisting safe)
    if (exception && exception.name === "PrismaClientKnownRequestError") {
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = "Internal server error";

      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        message = "A record with these details already exists in this context.";
      } else if (exception.code === "P2003") {
        status = HttpStatus.CONFLICT;
        message =
          "Cannot delete or modify entity because it is currently in use.";
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        message = "Record not found.";
      }

      return response.status(status).json({
        statusCode: status,
        message,
        error: HttpStatus[status],
      });
    }

    // Fallback for unhandled server errors
    console.error("Unhandled Exception in Academics:", exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
