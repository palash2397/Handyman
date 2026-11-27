import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a new user (Customer, Provider, or Company)',
    description:
      'Creates a new account for Customer, Individual Provider, or Company. Returns user details and an OTP.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'User registered successfully with OTP sent',
  })
  @SwaggerResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify 6-digit registration OTP',
    description:
      'Verifies the 6-digit OTP code sent during registration. On success, marks email as verified and returns JWT access token.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully and JWT token returned',
  })
  @SwaggerResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired OTP',
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP verification code',
    description:
      'Generates and resends a new 6-digit OTP code with a fresh 5-minute expiry window.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'OTP resent successfully',
  })
  @SwaggerResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with Email and Password',
    description:
      'Authenticates any registered user (including Admin) and returns a JWT access token.',
  })
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
