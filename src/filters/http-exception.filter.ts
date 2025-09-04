import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, } from '@nestjs/common';
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res: any = exception.getResponse();
      const payload = typeof res === 'string' ? { message: res } : res;
      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status],
        path: request.url,
        ...payload,
      });
      return;
    }

    console.error('Unhandled error:', exception);
    response.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      path: request.url,
      message: 'Something went wrong.',
    });
  }
}