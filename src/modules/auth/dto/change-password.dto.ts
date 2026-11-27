import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Registered email address (required if resetToken is not provided)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsIn...',
    description: 'Password reset token received from verify-otp (used for Forgot Password flow)',
  })
  @IsOptional()
  @IsString()
  resetToken?: string;

  @ApiPropertyOptional({
    example: 'oldPassword123',
    description: 'Current password (required when changing password while logged in without resetToken)',
  })
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 6 characters)',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;

  @ApiPropertyOptional({
    example: 'newPassword123',
    description: 'Confirmation of new password',
  })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
