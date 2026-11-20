import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Server is healthy and running',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-11-20T09:30:00.000Z',
        uptime: 125.4,
        message: 'Handyman API is up and running!',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Handyman API is up and running!',
    };
  }
}
