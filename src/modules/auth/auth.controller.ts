import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../../helpers/ApiResponse';
import { Msg } from '../../helpers/responseMsg';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @SwaggerResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
  })
  @SwaggerResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @SwaggerResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
