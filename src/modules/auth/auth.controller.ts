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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
    summary: 'Verify 6-digit OTP (for Registration or Password Reset)',
    description:
      'Verifies the 6-digit OTP code. For ACCOUNT_VERIFICATION: activates account and returns JWT accessToken. For FORGOT_PASSWORD: returns password resetToken.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully',
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
      'Generates and resends a new 6-digit OTP code for either registration or forgot-password with a fresh 5-minute expiry window.',
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
      'Authenticates any registered user (including Admin) and returns a JWT access token. Requires email verification first.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @SwaggerResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Account not verified or suspended',
  })
  @SwaggerResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot Password - Request OTP',
    description:
      'Sends a 6-digit OTP to the registered email address for password reset.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'OTP sent to registered email',
  })
  @SwaggerResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @SwaggerResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not verified or account suspended',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change or Reset Password',
    description:
      'Updates the user password. Can be used after forgot-password OTP verification (with resetToken) or by providing the current oldPassword.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @SwaggerResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Incorrect old password, same password entered, or validation failed',
  })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset Password (Alias for change-password)',
    description:
      'Resets the user password following OTP verification using the resetToken.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
  })
  async resetPassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }
}
